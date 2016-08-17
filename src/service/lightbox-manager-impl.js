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

import {fromClassForDoc} from '../service';
import {Pass} from '../pass';
import {whenDocumentReady} from '../document-ready';

const ELIGIBLE_TAGS = [
  'amp-img',
  'amp-ad',
  'amp-dailymotion',
  'amp-facebook',
  'amp-iframe', //?
  'amp-embed', //?
  'amp-instagram',
  'amp-jwplayer',
  'amp-kaltura-player',
  'amp-o2-player',
  'amp-pinterest',
  'amp-reach-player',
  'amp-twitter',
  'amp-vimeo',
  'amp-vine',
  'amp-youtube',
  'amp-anim',
  'amp-video',
  'blockquote',
];

const ELIGIBLE_TAP_TAGS = {
  'amp-img': true,
}

export class LighboxManager {

  /**
   * @param {!Window} window
   */
  constructor(ampdoc) {
    this.ampdoc = ampdoc;

    this.elems = null;

    /** @const {!Pass} */
    this.pass_ = new Pass(ampdoc.win, () => this.doPass_());

    whenDocumentReady(ampdoc).then(() => {
      this.loadLightboxViewer_();
      this.schedulePass();
    });
  }

  getNext(elem) {
    const curIndex = this.elems.indexOf(elem);
    if (curIndex < 0 || curIndex == this.elems.length - 1) {
      return;
    }
    return this.elems[curIndex + 1];
  }

  getPrevious(elem) {
    const curIndex = this.elems.indexOf(elem);
    if (curIndex <= 0) {
      return;
    }
    return this.elems[curIndex - 1];
  }

  doPass_() {
    //this.doAutoLightboxPass_();

    const elemList = this.ampdoc.getRootNode()
        .querySelectorAll('*[lightbox]');

    this.elems = Array.prototype.slice.call(elemList);
  }

  doAutoLightboxPass_() {
    for (const tag of ELIGIBLE_TAGS) {
      const elems = this.ampdoc.getRootNode().getElementsByTagName(tag);
      for (const elem of elems) {
        if (!this.meetsHeuristicsForAutoLightbox_(elem)) {
          continue;
        }

        elem.setAttribute('lightbox-enable', '');

        if (this.meetsHeuristicsForTap_(elem)) {
          elem.setAttribute('on', 'tap:amp-lightbox');
        }
      }
    }
  }

  meetsHeuristicsForAutoLightbox_(elem) {
    if (elem.hasAttribute('placeholder') &&
        elem.getAttribute('placeholder') == '') {
      return false;
    }

    // direct child of carousel is eligible
    if (elem.parentNode && elem.parentNode.tagName == 'AMP-CAROUSEL') {
      return true;
    }

    const layoutBox = elem.getLayoutBox();

    if (layoutBox.left < 0 ||
        layoutBox.width < 50 ||
        layoutBox.height < 50
    ) {
      return false;
    }

    return true;
  }

  meetsHeuristicsForTap_(elem) {
    if (!ELIGIBLE_TAP_TAGS[elem.tagName.toLowerCase()]) {
      return false;
    }
    if (elem.hasAttribute('on')) {
      //return false;
    }

    return true;
  }

  loadLightboxViewer_() {
    const script = this.ampdoc.getRootNode().createElement('script');
    script.setAttribute('async', '');
    script.setAttribute('custom-element', 'amp-lightbox-viewer');
    script.setAttribute('src', 'http://localhost:8000/dist/v0/amp-lightbox-viewer-0.1.max.js');
    this.ampdoc.getRootNode().body.appendChild(script);

    const viewer = this.ampdoc.getRootNode()
        .createElement('amp-lightbox-viewer');
    viewer.setAttribute('layout', 'nodisplay');
    viewer.setAttribute('id', 'amp-lightbox-viewer');
    this.ampdoc.getRootNode().body.appendChild(viewer);
  }

  schedulePass(opt_delay) {
    return this.pass_.schedule(opt_delay);
  }
}

export function installLightboxManagerForDoc(ampdoc) {
  return fromClassForDoc(ampdoc, 'lightboxManager', LighboxManager);
};
