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

import {childElements} from './dom';
import {dev, devAssert} from './log';
import {htmlFor, htmlRefs, svgFor} from './static-template';
import {isExperimentOn} from './experiments';
import {isVideoPlayerComponent} from './layout';
import {toWin} from './types';

/* LEGACY LOADER */

/** @private @const */
const LINE_LOADER_ELEMENTS = {
  'AMP-AD': true,
};

/**
 * Creates a default "loading indicator" element. This element accepts
 * `amp-active` class in which case it may choose to run an animation.
 * @param {!Document} doc
 * @param {string} elementName
 * @return {!Element}
 */
export function createLegacyLoaderElement(doc, elementName) {
  if (LINE_LOADER_ELEMENTS[elementName.toUpperCase()]) {
    return htmlFor(doc)`<div class="i-amphtml-loader-line">
          <div class="i-amphtml-loader-moving-line"></div>
        </div>`;
  }
  return htmlFor(doc)`<div class="i-amphtml-loader">
        <div class="i-amphtml-loader-dot"></div>
        <div class="i-amphtml-loader-dot"></div>
        <div class="i-amphtml-loader-dot"></div>
      </div>`;
}

/* NEW LOADER */

/**
 * Creates a default "loading indicator" element based on the new design.
 *
 * Please see https://github.com/ampproject/amphtml/issues/20237 for details,
 * screenshots and various states of the new loader design.
 *
 * @param {!AmpElement} element
 * @param {number} elementWidth
 * @param {number} elementHeight
 * @return {!Element} New loader root element
 */
export function createNewLoaderElement(element, elementWidth, elementHeight) {
  devAssert(
    isNewLoaderExperimentEnabled(toWin(element.ownerDocument.defaultView))
  );

  const loader = new LoaderBuilder(element, elementWidth, elementHeight);
  return loader.build();
}

/**
 * Helper class to build the new loader's DOM.
 */
class LoaderBuilder {
  /**
   * @param {!AmpElement} element
   * @param {number} elementWidth
   * @param {number} elementHeight
   */
  constructor(element, elementWidth, elementHeight) {
    /** @private @const {!AmpElement} */
    this.element_ = element;

    /** @private @const  {number} */
    this.layoutWidth_ = elementWidth;

    /** @private @const  {number} */
    this.layoutHeight_ = elementHeight;

    /** @private {?Element} */
    this.domRoot_;

    /** @private {?Element} */
    this.svgRoot_;
  }

  /**
   * Builds the loader's DOM and returns the element.
   * @return {!Element} new loader root element
   */
  build() {
    this.buildContainers_();
    this.maybeAddDefaultPlaceholder_();
    this.maybeAddLoaderAnimation_();

    return dev().assertElement(this.domRoot_);
  }

  /**
   * Builds the wrappers for the loader.
   * @private
   */
  buildContainers_() {
    const html = htmlFor(this.element_);
    this.domRoot_ = html`
      <div class="i-amphtml-new-loader">
        <div>
          <svg
            ref="svgRoot"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="24 24 72 72"
          ></svg>
        </div>
      </div>
    `;

    /**
     * There is an extra inner div here for backward compatibility with
     * customizing loaders. The common and documented CSS for customizing
     * loaders includes a style to hide the old three dots via:
     *  .my-custom-loader .amp-active > div {
     *     display: none;
     *  }
     * The extra div mimic a similar DOM.
     */
    this.svgRoot_ = dev().assertElement(htmlRefs(this.domRoot_)['svgRoot']);
  }

  /**
   * Adds a combination of spinner/logo if element is eligible based on
   * certain heuristics.
   */
  maybeAddLoaderAnimation_() {
    // If very small or already has image placeholder, no loader animation.
    if (this.isTiny_() || this.hasBlurryImagePlaceholder_()) {
      return;
    }

    this.setSize_();
    this.maybeAddBackgroundShim_();
    this.addSpinner_();
    this.maybeAddLogo_();
  }

  /**
   * Sets the size of the loader based element's size and a few special cases.
   * @private
   */
  setSize_() {
    const sizeClassDefault = 'i-amphtml-new-loader-size-default';
    const sizeClassSmall = 'i-amphtml-new-loader-size-small';
    const sizeClassLarge = 'i-amphtml-new-loader-size-large';

    // Ads always get the default spinner regardless of the element size
    if (this.isAd_()) {
      return this.domRoot_.classList.add(sizeClassDefault);
    }

    // Other than Ads, small spinner is always used if element is small.
    if (this.isSmall_()) {
      return this.domRoot_.classList.add(sizeClassSmall);
    }

    // If host is not small, default size spinner is normally used
    // unless due to branding guidelines (e.g. Instagram) a larger spinner is
    // required.
    if (this.requiresLargeSpinner_()) {
      return this.domRoot_.classList.add(sizeClassLarge);
    }
    return this.domRoot_.classList.add(sizeClassDefault);
  }

  /**
   * Adds the spinner.
   * @private
   */
  addSpinner_() {
    const svg = svgFor(this.element_);
    const spinner = svg`
      <g class="i-amphtml-new-loader-spinner">
        <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60">
        </circle>
        <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60">
        </circle>
        <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60">
        </circle>
        <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60">
        </circle>
      </g>
    `;

    this.svgRoot_.appendChild(spinner);
  }

  /**
   * Adds the default or branded logo.
   * @private
   */
  maybeAddLogo_() {
    const logo = this.getLogo_();

    // Ads always get the logo regardless of size
    if (this.isAd_()) {
      return this.addLogo_(logo);
    }

    // Small hosts do not get a logo
    if (this.isSmall_()) {
      return;
    }

    // If element requires a background shim but logo is the default,
    // we don't show the logo.
    if (this.requiresBackgroundShim_() && logo.isDefault) {
      return;
    }

    return this.addLogo_(logo);
  }

  /**
   * Adds the given logo to the loader.
   * @param {!Element} logo
   */
  addLogo_(logo) {
    this.svgRoot_.appendChild(logo.svg);
  }

  /**
   * Adds the background shim under the loader for cases where loader is on
   * top of an image.
   * @private
   */
  maybeAddBackgroundShim_() {
    if (!this.requiresBackgroundShim_()) {
      return;
    }

    const svg = svgFor(this.element_);
    const shimNode = svg`
      <circle
        class="i-amphtml-new-loader-shim"
        cx="60"
        cy="60"
      >
      </circle>
    `;

    this.domRoot_.classList.add('i-amphtml-new-loader-has-shim');
    this.svgRoot_.appendChild(shimNode);
  }

  /**
   * Add a gray default placeholder if there isn't a placeholder already and
   * other special cases.
   * @private
   */
  maybeAddDefaultPlaceholder_() {
    const hasPlaceholder = !!this.element_.getPlaceholder();
    const hasPoster = this.element_.hasAttribute('poster');
    if (hasPlaceholder || hasPoster) {
      return;
    }

    // Is it whitelisted for default placeholder?
    const tagName = this.element_.tagName.toUpperCase();
    if (
      DEFAULT_PLACEHOLDER_WHITELIST_NONE_VIDEO[tagName] || // static white list
      isVideoPlayerComponent(tagName) // regex for various video players
    ) {
      const html = htmlFor(this.element_);
      const defaultPlaceholder = html`
        <div placeholder class="i-amphtml-default-placeholder"></div>
      `;
      this.element_.appendChild(defaultPlaceholder);
    }
  }

  /**
   * Returns the logo for the element.
   * @private
   * @return {!Element}
   */
  getLogo_() {
    const logo = this.getCustomLogo_();
    return logo || this.getDefaultLogo_();
  }

  /**
   * Returns the custom logo for the element if there is one.
   * @private
   * @return {?Element}
   */
  getCustomLogo_() {
    // Not Implemented
    return null;
  }

  /**
   * Returns the default logo.
   * @private
   * @return {!Element}
   */
  getDefaultLogo_() {
    const svg = svgFor(this.element_);
    const svgNode = svg`
      <circle
        class="i-amphtml-new-loader-logo"
        cx="60"
        cy="60"
        r="12"
        fill="#aaaaaa"
      >
      </circle>
    `;

    return {
      svg: svgNode,
      isDefault: true,
    };
  }

  /**
   * Whether the element is an Ad.
   * @private
   * @return {boolean}
   */
  isAd_() {
    // Not Implemented
    return false;
  }

  /**
   * Whether the element is small.
   * Small elements get a different loader with does not have a logo and is
   * just a spinner.
   * @private
   * @return {boolean}
   */
  isSmall_() {
    return (
      !this.isTiny_() && (this.layoutWidth_ <= 100 || this.layoutHeight_ <= 100)
    );
  }

  /**
   * Very small layout are not eligible for new loaders.
   * @return {boolean}
   */
  isTiny_() {
    return this.layoutWidth_ < 50 || this.layoutHeight_ < 50;
  }

  /**
   * Whether element has an image blurry placeholder
   * @return {boolean}
   */
  hasBlurryImagePlaceholder_() {
    if (this.element_.hasAttribute('poster')) {
      return true;
    }
    const placeholder = this.element_.getPlaceholder();
    return (
      placeholder &&
      placeholder.classList.contains('i-amphtml-blurry-placeholder')
    );
  }

  /**
   * Whether loaders needs the translucent background shim, this is normally
   * needed when the loader is on top of an image placeholder:
   *    - placeholder is `amp-img`
   *    - Element has implicit placeholder like a `poster` on video
   * @private
   * @return {boolean}
   */
  requiresBackgroundShim_() {
    if (this.element_.hasAttribute('poster')) {
      return true;
    }
    const placeholder = this.element_.getPlaceholder();
    if (!placeholder) {
      return false;
    }
    if (placeholder.tagName == 'AMP-IMG') {
      return true;
    }
    return false;
  }

  /**
   * Some components such as Instagram require larger spinner due to
   * branding guidelines.
   * @private
   * @return {boolean}
   */
  requiresLargeSpinner_() {
    // Not Implemented
    return false;
  }
}

/**
 * Elements will get a default gray placeholder if they don't already have a
 * placeholder. This list does not include video players which are detected
 * using `isVideoPlayerComponent`
 * @enum {boolean}
 * @private  Visible for testing only!
 */
const DEFAULT_PLACEHOLDER_WHITELIST_NONE_VIDEO = {
  'AMP-IMG': true,
};

/**
 * Whether the new loader experiment is enabled.
 * @param {!Window} win
 * @return {boolean}
 */
export function isNewLoaderExperimentEnabled(win) {
  return isExperimentOn(win, 'new-loaders');
}
