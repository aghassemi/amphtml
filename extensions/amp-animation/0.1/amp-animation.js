/**
 * Copyright 2016 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {MeasureScanner} from './web-animations';
import {Pass} from '../../../src/pass';
import {WebAnimationPlayState} from './web-animation-types';
import {childElementByTag} from '../../../src/dom';
import {getFriendlyIframeEmbedOptional}
    from '../../../src/friendly-iframe-embed';
import {getParentWindowFrameElement, getServiceForDoc} from '../../../src/service';
import {isExperimentOn} from '../../../src/experiments';
import {installWebAnimations} from 'web-animations-js/web-animations.install';
import {listen} from '../../../src/event-helper';
import {setStyles} from '../../../src/style';
import {tryParseJson} from '../../../src/json';
import {user, dev} from '../../../src/log';
import {viewerForDoc} from '../../../src/services';
import {viewportForDoc, vsyncFor} from '../../../src/services';
import {installPositionObserverServiceForDoc, PositionObserverFidelity}
    from '../../../src/service/position-observer';
import {Observable} from '../../../src/observable';
import {getMode} from '../../../src/mode';
import {getIntersectionChangeEntry} from '../../../src/intersection-observer';

const TAG = 'amp-animation';

class PositionObserver {

  constructor(ampdoc) {
    this.ampdoc_ = ampdoc;
    this.inabox_ = getMode(this.ampdoc_.win).runtime == 'inabox';
    dev().assert(!this.inabox_, 'ScrollSync not supported for in-a-box yet');

    this.ampdoc_ = ampdoc;

    this.entries_ = [];
    this.started_ = false;

    /** @const @private {!Vsync} */
    this.vsync_ = vsyncFor(ampdoc.win);

    this.viewport_ = viewportForDoc(ampdoc);

  }

  observe(element) {
    //TODO(aghassemi) handle in-a-box
    dev().assert(!this.inabox_);

    const elementBelongsToAmpDoc = this.ampdoc_.contains(element);
    if (!elementBelongsToAmpDoc) {
      const frameElem = getParentWindowFrameElement(element, this.ampdoc_.win);

      // TODO(aghassemi):
      dev().warn('ScrollSync observe requested for an element that is inside ' +
          'a friendly iframe. Using the whole iframe instead of the element');
      element = frameElem;
    }

    const positionObservable = new Observable();
    const entry = {
      element,
      positionObservable,
      position: null,
    };

    this.entries_.push(entry);

    this.start_();

    return positionObservable;
  }

  start_() {
    if (this.started_) {
      return;
    }
    this.started_ = true;
    this.schedulePass_();
  }

  schedulePass_() {
    this.vsync_.measure(() => {
      this.pass_();
      // TODO(aghassemi): optimize this
      this.schedulePass_();
    });
  }

  pass_() {
    for (let i = 0; i < this.entries_.length; i++) {
      const entry = this.entries_[i];
      const elementBox = this.viewport_.getLayoutRect(entry.element);
      const boxEntry = getIntersectionChangeEntry(elementBox, null,
          this.viewport_.getRect());
      const position = boxEntry.boundingClientRect;
      if (!this.layoutRectEquals_(entry.position, position)) {
        entry.positionObservable.fire(position);
        entry.position = position;
      }
    }
  }

  //TODO(aghassemi): Move to layout-rect.js as helper method
  layoutRectEquals_(l1, l2) {
    if (!l1 || !l2) {
      return false;
    }
    return l1.left == l2.left && l1.top == l2.top &&
        l1.width == l2.width && l1.height == l2.height;
  }

}

// TODO(aghassemi): Add visibility conditions.
class ScrollboundScene {

  constructor(ampdoc, element) {
    this.viewport_ = viewportForDoc(ampdoc);
    this.vsync_ = vsyncFor(ampdoc.win);
    installPositionObserverServiceForDoc(ampdoc);

    this.positionObserver_ = getServiceForDoc(ampdoc, 'position-observer');
    this.element_ = element;

    this.scrollDurationObservable = new Observable();
    this.positionObservable = new Observable();

    this.scrollDuration_ = null;

    // allow initial registrations of handlers before triggering events.
    this.vsync_.mutate(() => {
      this.setupEventHandlers_();
    });
  }

  setupEventHandlers_() {
    this.positionObserver_.observe(this.element_,
      PositionObserverFidelity.HIGH, this.onPositionChanged_.bind(this));
  }

  onPositionChanged_(newPos) {
    // Only fire if visible
    // TODO(aghassemi): Consider embed specific visibility as part of this.
    const vpRect = newPos.viewportRect;
    const posRec = newPos.positionRect;
    // outside of the viewport
    if (!posRec) {
      // TODO: we need to know which way to update positionObservable
      return;
    }

    // until we have visibility conditions exposed scroll duration is amount
    // from when element is fully visible until element is partially
    // invisible which is basically viewportHeight - elementHeight
    const scrollDuration = vpRect.height - posRec.height;

    if (scrollDuration != this.scrollDuration_) {
      this.scrollDuration_ = scrollDuration;
      this.scrollDurationObservable.fire(scrollDuration);
    }
    const isFullyVisible = posRec.bottom <= vpRect.height && posRec.top >= 0;

    if (isFullyVisible) {
      this.positionObservable.fire(vpRect.height - posRec.bottom);
    } else {
      // send the final position
      if (posRec.bottom < vpRect.height) {
        this.positionObservable.fire(scrollDuration);
      } else {
        this.positionObservable.fire(0);
      }
    }
  }
}

export class AmpAnimation extends AMP.BaseElement {

  /** @param {!AmpElement} element */
  constructor(element) {
    super(element);

    /** @private {boolean} */
    this.triggerOnVisibility_ = false;

    /** @private {boolean} */
    this.visible_ = false;

    /** @private {boolean} */
    this.triggered_ = false;

    /** @private {?../../../src/friendly-iframe-embed.FriendlyIframeEmbed} */
    this.embed_ = null;

    /** @private {?JSONType} */
    this.configJson_ = null;

    /** @private {?./web-animations.WebAnimationRunner} */
    this.runner_ = null;

    /** @private {?Pass} */
    this.restartPass_ = null;
  }

  /** @override */
  buildCallback() {
    user().assert(isExperimentOn(this.win, TAG),
        `Experiment "${TAG}" is disabled.`);

    // TODO(dvoytenko): Remove once we support direct parent visibility.
    user().assert(this.element.parentNode == this.element.ownerDocument.body,
        `${TAG} is only allowed as a direct child of <body> element.` +
        ' This restriction will be removed soon.');

    // Trigger.
    const trigger = this.element.getAttribute('trigger');
    if (trigger) {
      this.triggerOnVisibility_ = user().assert(
          trigger == 'visibility',
          'Only allowed value for "trigger" is "visibility": %s',
          this.element);
    }

    // Parse config.
    const scriptElement = user().assert(
        childElementByTag(this.element, 'script'),
        '"<script type=application/json>" must be present');
    this.configJson_ = tryParseJson(scriptElement.textContent, error => {
      throw user().createError('failed to parse animation script', error);
    });

    if (this.triggerOnVisibility_) {
      // Make the element minimally displayed to make sure that `layoutCallback`
      // is called.
      this.mutateElement(() => {
        setStyles(this.element, {
          visibility: 'hidden',
          top: '0px',
          left: '0px',
          width: '1px',
          height: '1px',
          display: 'block',
          position: 'fixed',
        });
      });
    }

    // Restart with debounce.
    this.restartPass_ = new Pass(
        this.win,
        this.startOrResume_.bind(this),
        /* delay */ 50);

    // Visibility.
    const ampdoc = this.getAmpDoc();
    const frameElement = getParentWindowFrameElement(this.element, ampdoc.win);
    const embed =
        frameElement ? getFriendlyIframeEmbedOptional(frameElement) : null;
    if (embed) {
      this.embed_ = embed;
      this.setVisible_(embed.isVisible());
      embed.onVisibilityChanged(() => {
        this.setVisible_(embed.isVisible());
      });
      listen(this.embed_.win, 'resize', () => this.onResize_());
    } else {
      const viewer = viewerForDoc(ampdoc);
      this.setVisible_(viewer.isVisible());
      viewer.onVisibilityChanged(() => {
        this.setVisible_(viewer.isVisible());
      });
      this.getViewport().onChanged(e => {
        if (e.relayoutAll) {
          this.onResize_();
        }
      });
    }

    // HACK DONT SUBMIT. layoutCallback is not ever called for A4A case
    // for some reason.
    if (this.triggerOnVisibility_) {
      this.activate();
    }
  }

  setupScrollboundAnimatins_() {
    dev().assert(this.runner_);
    if (!this.runner_.hasScrollboundAnimations()) {
      return;
    }

    // TODO: support scene-id attribute as well. Would take over parent as
    // the scene.
    let sceneElement;
    if (this.embed_) {
      sceneElement = this.embed_.iframe;
    } else {
      sceneElement = this.win.document.documentElement;
    }

    this.scene_ = new ScrollboundScene(this.getAmpDoc(), sceneElement);

    this.scene_.scrollDurationObservable.add(newDuration => {
      this.runner_.updateScrollDuration(newDuration);
    });

    this.scene_.positionObservable.add(newPos => {
      this.runner_.scrollTick(newPos);
    });
  }

  /** @override */
  layoutCallback() {
    if (this.triggerOnVisibility_) {
      this.activate();
    }
    return Promise.resolve();
  }

  /** @override */
  pauseCallback() {
    this.setVisible_(false);
  }

  /** @override */
  activate() {
    // The animation has been triggered, but there's no guarantee that it
    // will actually be running.
    this.triggered_ = true;
    if (this.visible_) {
      this.startOrResume_();
    }
  }

  /**
   */
  finish() {
    this.triggered_ = false;
    if (this.runner_) {
      this.runner_.finish();
      this.runner_ = null;
    }
  }

  /**
   * @param {boolean} visible
   * @private
   */
  setVisible_(visible) {
    if (this.visible_ != visible) {
      this.visible_ = visible;
      if (this.triggered_) {
        if (this.visible_) {
          this.startOrResume_();
        } else {
          this.pause_();
        }
      }
    }
  }

  /** @private */
  onResize_() {
    // Store the previous `triggered` value since `cancel` may reset it.
    const triggered = this.triggered_;

    // Stop animation right away.
    if (this.runner_) {
      this.runner_.cancel();
      this.runner_ = null;
    }

    // Restart the animation, but debounce to avoid re-starting it multiple
    // times per restart.
    this.triggered_ = triggered;
    if (this.triggered_ && this.visible_) {
      this.restartPass_.schedule();
    }
  }

  /**
   * @return {?Promise}
   * @private
   */
  startOrResume_() {
    if (!this.triggered_ || !this.visible_) {
      return null;
    }

    if (this.runner_) {
      this.runner_.resume();
      return null;
    }

    return this.createRunner_().then(runner => {
      this.runner_ = runner;
      this.runner_.onPlayStateChanged(this.playStateChanged_.bind(this));
      this.setupScrollboundAnimatins_();
      this.runner_.start();
    });
  }

  /**
   * @return {!Promise<!./web-animations.WebAnimationRunner>}
   * @private
   */
  createRunner_() {
    // Force cast to `WebAnimationDef`. It will be validated during preparation
    // phase.
    const configJson = /** @type {!./web-animation-types.WebAnimationDef} */ (
        this.configJson_);

    // Ensure polyfill is installed.
    if (!this.win.Element.prototype.animate) {
      installWebAnimations(this.win);
    }

    const vsync = this.getVsync();
    const readyPromise = this.embed_ ? this.embed_.whenReady() :
        this.getAmpDoc().whenReady();
    return readyPromise.then(() => {
      const measurer = new MeasureScanner(this.win, {
        resolveTarget: this.resolveTarget_.bind(this),
      }, /* validate */ true);
      return vsync.measurePromise(() => {
        measurer.scan(configJson);
        return measurer.createRunner(this.element.getResources());
      });
    });
  }

  /**
   * @param {string} id
   * @return {?Element}
   * @private
   */
  resolveTarget_(id) {
    if (this.embed_) {
      return this.embed_.win.document.getElementById(id);
    }
    return this.getAmpDoc().getElementById(id);
  }

  /** @private */
  pause_() {
    if (this.runner_) {
      this.runner_.pause();
    }
  }

  /**
   * @param {!WebAnimationPlayState} playState
   * @private
   */
  playStateChanged_(playState) {
    if (playState == WebAnimationPlayState.FINISHED) {
      this.finish();
    }
  }
}


AMP.extension(TAG, '0.1', function(AMP) {
  AMP.registerElement(TAG, AmpAnimation);
});
