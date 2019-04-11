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

import {htmlFor} from './static-template';
import {isExperimentOn} from './experiments';

/**
 * @param {!Element} element
 * @return {boolean}
 */
function isAd(element) {
  return element.tagName == 'AMP-AD';
}

/**
 * @param {!Element} element
 * @return {boolean}
 */
function isImage(element) {
  return element.tagName == 'IMG' || element.tagName == 'AMP-IMG';
}

/**
 * Creates a default "loading indicator" element. This element accepts
 * `amp-active` class in which case it may choose to run an animation.
 * @param {!Document} doc
 * @param {!Element} container
 * @param {!AmpElement} element
 * @return {!Element}
 */
export function createLoaderElement(doc, container, element) {
  const win = doc.defaultView;

  if (isAd(element) && !isExperimentOn(win, 'new-loaders-ad')) {
    return createOldAdLoader(doc);
  }

  return isExperimentOn(win, 'new-loaders') ?
    createNewLoader(doc, container, element) :
    createOldLoader(doc);
}

/**
 * @param {!Document} doc
 */
function createOldAdLoader(doc) {
  return htmlFor(doc)`<div class="i-amphtml-loader-line">
    <div class="i-amphtml-loader-moving-line"></div>
  </div>`;
}

/**
 * @param {!Document} doc
 */
function createOldLoader(doc) {
  return htmlFor(doc)`<div class="i-amphtml-loader">
        <div class="i-amphtml-loader-dot"></div>
        <div class="i-amphtml-loader-dot"></div>
        <div class="i-amphtml-loader-dot"></div>
      </div>`;
}

/**
 * @param {!Document} doc
 * @param {!Element} container
 * @param {!AmpElement} element
 */
function createNewLoader(doc, container, element) {
  const placeholder = element.getPlaceholder();

  let loaderBrand = element.createLoaderBrand();
  if (isAd(element)) {
    loaderBrand = `<g class="i-amphtml-new-loader-logo">
    <path d="M68,54c0.55,0,1,0.45,1,1v10c0,0.55-0.45,1-1,1H52c-0.55,0-1-0.45-1-1V55c0-0.55,0.45-1,1-1H68 M68,53H52c-1.1,0-2,0.9-2,2
    v10c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V55C70,53.9,69.1,53,68,53L68,53z"></path>
        <text class="i-amphtml-ad-badge-label" transform="matrix(1 0 0 1 53.2812 64.167)">Ad</text>
    </g>`;
  }
  const loaderElement = htmlFor(doc)`
<div class="i-amphtml-new-loader">
  <div><svg xmlns="http://www.w3.org/2000/svg" viewBox="24 24 72 72">
  <circle class="i-amphtml-new-loader-circle" cx="60" cy="60" r="12"></circle>
  <g class="i-amphtml-new-loader-spinner">
    <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60" r="22">
    </circle>
    <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60" r="22">
    </circle>
    <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60" r="22">
    </circle>
    <circle class="i-amphtml-new-loader-spinner-segment" cx="60" cy="60" r="22">
    </circle>
  </g>
  <g class="i-amphtml-new-loader-logo">

  <path d="M60,50c-5.52,0-9.99,4.47-9.99,9.99c0,4.24,2.63,7.85,6.35,9.31c-0.09-0.79-0.16-2.01,0.03-2.87
                  	c0.18-0.78,1.17-4.97,1.17-4.97s-0.3-0.6-0.3-1.48c0-1.39,0.81-2.43,1.81-2.43c0.86,0,1.27,0.64,1.27,1.41
                  	c0,0.86-0.54,2.14-0.83,3.33c-0.24,1,0.5,1.81,1.48,1.81c1.78,0,3.14-1.88,3.14-4.57c0-2.39-1.72-4.06-4.18-4.06
                  	c-2.85,0-4.51,2.13-4.51,4.33c0,0.86,0.33,1.78,0.74,2.28c0.08,0.1,0.09,0.19,0.07,0.29c-0.07,0.31-0.25,1-0.28,1.13
                  	c-0.04,0.18-0.15,0.22-0.34,0.13c-1.25-0.58-2.03-2.4-2.03-3.87c0-3.15,2.29-6.04,6.6-6.04c3.46,0,6.16,2.47,6.16,5.77
                  	c0,3.45-2.17,6.22-5.18,6.22c-1.01,0-1.97-0.53-2.29-1.15c0,0-0.5,1.91-0.62,2.38c-0.22,0.87-0.83,1.96-1.24,2.62
                    c0.94,0.29,1.92,0.44,2.96,0.44c5.52,0,9.99-4.47,9.99-9.99C69.99,54.47,65.52,50,60,50z"></path>


  </g>
  </svg></div>
</div>`;
//   <path d="M68,54c0.55,0,1,0.45,1,1v10c0,0.55-0.45,1-1,1H52c-0.55,0-1-0.45-1-1V55c0-0.55,0.45-1,1-1H68 M68,53H52c-1.1,0-2,0.9-2,2
// v10c0,1.1,0.9,2,2,2h16c1.1,0,2-0.9,2-2V55C70,53.9,69.1,53,68,53L68,53z"></path>
 // <text class="i-amphtml-ad-badge-label" transform="matrix(1 0 0 1 53.2812 64.167)">Ad</text>
  if (!placeholder) {
    container.classList.add('i-amphtml-loading-container-grey');
  }
  if (placeholder && isImage(placeholder)) {
    loaderElement.classList.add('i-amphtml-new-loader-overlay');
  }
  if (isAd(element)) {
    loaderElement.classList.add('i-amphtml-new-loader-ad');
  }
  if (isSmall(element)) {
    loaderElement.classList.add('i-amphtml-new-loader-small');
  }
  if (loaderBrand) {
    loaderElement.classList.add('i-amphtml-new-loader-branded');
    //loaderElement.firstElementChild.firstElementChild.appendChild(loaderBrand);
  }
  return loaderElement;
}

const SmallLoaderSizeThreshold = 150;
/**
 * @param {!AmpElement} element
 * @return {boolean}
 */
function isSmall(element) {
  const box = element.getLayoutBox();
  if (box.width < SmallLoaderSizeThreshold ||
      box.height < SmallLoaderSizeThreshold) {
    return true;
  }

  return false;
}
