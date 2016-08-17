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

import {whenDocumentReady} from '../document-ready';
import {applyLayout} from '../service';
import {fromClassForDoc} from '../service';
import {dev} from '../log';

/**
 * LighboxManager is a document-scoped service responsible for:
 *  -Finding elements marked to be lightboxable (via lightbox attribute)
 *  -Keeping an ordered list of lightboxable elements
 *  -Providing functionality to get next/previous lightboxable element given
 *   the current element.
 *  -Importing and installing the amp-lightbox-viewer if not already present
 *   in the page.
 *  -Auto discovering elements that meet the heuristics to be lightboxable
 *   when auto-lightbox functionality is enabled.
 */
export class LighboxManager {

  /**
   * @param {!./ampdoc-impl.AmpDoc} ampdoc
   */
  constructor(ampdoc) {

    /** @const @private {!./ampdoc-impl.AmpDoc} */
    this.ampdoc_ = ampdoc;

    /**
     * Ordered list of lightboxable elements.
     * @private {!Array<!Element>}
     **/
    this.elements_ = null;

    this.scanPromise_ = null;
  }

  getNext(elem) {
    return this.maybeScanLightboxables_().then(() => {
      const curIndex = this.elements_.indexOf(elem);
      dev().assert(curIndex != -1);
      if (curIndex == this.elements_.length - 1) {
        return null;
      }
      return this.elements_[curIndex + 1];
    });
  }

  getPrevious(elem) {
    return this.maybeScanLightboxables_().then(() => {
      const curIndex = this.elements_.indexOf(elem);
      dev().assert(curIndex != -1);
      if (curIndex == 0) {
        return null;
      }
      return this.elements_[curIndex - 1];
    });

  }

  hasNext(elem) {
    return this.getNext(elem).then(next => {
      return !!next;
    });
  }

  hasPrevious(elem) {
    return this.getPrevious(elem).then(prev => {
      return !!prev;
    });
  }

  maybeScanLightboxables_() {
    if (this.scanPromise_) {
      return this.scanPromise_;
    }

    this.scanPromise_ = whenDocumentReady(this.ampdoc_).then((ampdoc) => {
      const matches = ampdoc.getRootNode().querySelectorAll('[lightbox]');
      this.elements_ = [];
      for (let i = 0; i < matches.length; i++) {
        const elem = matches[i];
        if (elem.getAttribute('lightbox').toLowerCase() != 'none') {
          this.elements_.push(elem);
        }
      }
    });

    return this.scanPromise_;
  }
}

export function installLightboxManagerForDoc(ampdoc) {
  return fromClassForDoc(ampdoc, 'lightboxManager', LighboxManager);
};
