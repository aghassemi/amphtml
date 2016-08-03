/**
 * Copyright 2015 The AMP HTML Authors. All Rights Reserved.
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

import {CSS} from '../../../build/amp-lightbox-viewer-0.1.css';
import {Layout} from '../../../src/layout';
import {lightboxManagerForDoc} from '../../../src/lightbox-manager.js';
import {dev} from '../../../src/log';
import {ancestorElements} from '../../../src/dom';

class AmpLightboxViewer extends AMP.BaseElement {

  /** @override */
  isLayoutSupported(layout) {
    return layout == Layout.NODISPLAY;
  }

  /** @override */
  activate(invocation) {
    this.open_(invocation.source);
  }

  buildLazy_() {
    if (this.container_) {
      return;
    }

    this.active_ = false;
    this.activeElem = null;
    this.boundCloseOnEscape_ = this.closeOnEscape_.bind(this);
    this.manager_ = lightboxManagerForDoc(this.win.document.documentElement);

    this.container_ = this.win.document.createElement('div');
    this.container_.classList.add('-amp-lightbox-viewer');

    this.buildMask_();
    this.buildControls_();

    this.element.appendChild(this.container_);
  }

  buildMask_() {
    dev.assert(this.container_);
    const mask = this.win.document.createElement('div');
    mask.classList.add('-amp-lightbox-viewer-mask');
    this.container_.appendChild(mask);
  }

  buildControls_() {
    const next = this.next_.bind(this);
    const prev = this.previous_.bind(this);
    const close = this.close_.bind(this);

    // TODO(aghassemi): i18n and customization. See https://git.io/v6JWu
    this.buildButton_('Next', 'amp-lightbox-viewer-button-next', next);
    this.buildButton_('Previous', 'amp-lightbox-viewer-button-previous', prev);
    this.buildButton_('Close', 'amp-lightbox-viewer-button-close', close);
  }

  buildButton_(label, className, action) {
    const button = this.win.document.createElement('div');

    button.setAttribute('role', 'button');
    button.setAttribute('aria-label', label);
    button.classList.add(className);
    button.addEventListener('click', action);

    this.container_.appendChild(button);
  }

  open_(elem) {
    if (this.active_ && this.activeElem_ == elem) {
      return;
    }

    this.buildLazy_();

    this.updateViewer_(elem);

    this.element.style.display = 'block';
    this.active_ = true;

    this.win.document.documentElement.addEventListener(
        'keydown', this.boundCloseOnEscape_);
  }

  close_(event) {
    if (event) {
      event.stopPropagation();
    }
    if (!this.active_) {
      return;
    }

    this.element.style.display = 'none';
    this.tearDownElem_(this.activeElem_);

    this.activeElem_ = null;
    this.active_ = false;

    this.win.document.documentElement.removeEventListener(
        'keydown', this.boundCloseOnEscape_);
  }

  next_(event) {
    if (event) {
      event.stopPropagation();
    }

    const nextElem = this.manager_.getNext(this.activeElem_);
    dev.assert(nextElem);

    this.updateViewer_(nextElem);
  }

  previous_(event) {
    if (event) {
      event.stopPropagation();
    }
    const prevElem = this.manager_.getPrevious(this.activeElem_);
    dev.assert(prevElem);

    this.updateViewer_(prevElem);
  }

  setupElem_(elem) {
    this.updateStackingContext_(elem, false);
    elem.classList.add('amp-lightboxed');
  }

  tearDownElem_(elem) {
    this.updateStackingContext_(elem, true);
    elem.classList.remove('amp-lightboxed');
  }

  updateViewer_(newElem) {
    const previousElem = this.activeElem_;
    dev.assert(newElem);
    dev.assert(newElem != previousElem);

    // tear down the previous element
    if (previousElem) {
      this.tearDownElem_(previousElem);
    }

    // setup the new element
    this.setupElem_(newElem);

    // update the controls
    this.updateControls_(newElem);

    // update to new element
    this.activeElem_ = newElem;

    // TODO(aghassemi): Preloading

    // TODO(aghassemi): This is a big hack
    if (newElem.resources_) {
      newElem.__AMP__RESOURCE.setInViewport(true);
      newElem.resources_.scheduleLayout(newElem, newElem);
    }
  }

  updateControls_(newElem) {
    const prevElem = this.manager_.getPrevious(newElem);
    const nextElem = this.manager_.getNext(newElem);
    if (!prevElem) {
      this.container_.setAttribute('no-prev', '');
    } else {
      this.container_.removeAttribute('no-prev');
    }

    if (!nextElem) {
      this.container_.setAttribute('no-next', '');
    } else {
      this.container_.removeAttribute('no-next');
    }
  }
  updateStackingContext_(elem, reset) {
    const ancestors = ancestorElements(elem, e => {
      return e.style.position != 'static';
    });
    for (let i = 0 ; i < ancestors.length; i++) {
      const p = ancestors[i];
      if (reset) {
        p.style.zIndex = '';
      } else {
        p.style.zIndex = 'auto';
      }
    }
  }

  closeOnEscape_(event) {
    // TODO(aghassemi): Add helper utility for keyboard events or an enum.
    if (event.keyCode == 27) {
      this.close_();
    }
  }

}

AMP.registerElement('amp-lightbox-viewer', AmpLightboxViewer, CSS);
