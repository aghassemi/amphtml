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

import * as st from './style';
import {viewportForDoc} from './viewport';
import {vsyncFor} from './vsync';

export function installParallax(global) {
  const parallaxElements = global.document.querySelectorAll('*[amp-fx-parallax]');
  const scaleElements = global.document.querySelectorAll('*[amp-fx-hero-scale]');
  const fadeElements = global.document.querySelectorAll('*[amp-fx-fade]');
  for (let i = 0; i < fadeElements.length; i++) {
    st.setStyles(fadeElements[i], {
      'opacity': 0,
    });
  }

  for (let i = 0; i < scaleElements.length; i++) {
    const rec = scaleElements[i].getBoundingClientRect();
    scaleElements[i].originalH = rec.height;
  }

  const viewport = viewportForDoc(global.document);
  const vsync = vsyncFor(global);

  viewport.onScroll(schedule);
  let prevScrollTop = 0;
  function parallaxMutate() {

    const newScrollTop = viewport.getScrollTop();
    const delta = prevScrollTop - newScrollTop;

    for (let i = 0; i < parallaxElements.length; i++) {
      const element = parallaxElements[i];
      const rec = element.getBoundingClientRect();
      if (!isInView(rec, viewport)) {
        continue;
      };

      prevScrollTop = newScrollTop;
      let factor = element.getAttribute('amp-fx-parallax');
      factor = (factor ? parseFloat(factor) : 0.5) - 1;
      const offset = (delta * factor);
      if (!element.parallaxOffset) {
        element.parallaxOffset = 0;
      }
      element.parallaxOffset = element.parallaxOffset + offset;
      st.setStyles(element, {
        transform: 'translate3d(0,' + element.parallaxOffset.toFixed(2) + 'px,0)',
      });
    }
  }

  function fadeInMutate() {
    for (let i = 0; i < fadeElements.length; i++) {
      const element = fadeElements[i];
      const rec = element.getBoundingClientRect();
      if (!isInView(rec, viewport) || element.ampSkipFade) {
        continue;
      };
      const h = viewport.getHeight() / 2;
      if (rec.top < h) {
        st.setStyles(element, {
          'opacity': 1,
        });
        element.ampSkipFade = true;
        continue;
      }
      const factor = (1 - Math.abs(((h - rec.top) / h)).toFixed(2));

      st.setStyles(element, {
        'opacity': factor,
      });
    }
  }

  function scaleMutate() {
    for (let i = 0; i < scaleElements.length; i++) {
      const element = scaleElements[i];
      const rec = element.getBoundingClientRect();
      if (!isInView(rec, viewport)) {
        continue;
      };

      const newH = element.originalH - viewport.getScrollTop();
      st.setStyles(element, {
        'height': newH + 'px',
      });
    }
  }

  function schedule() {
    vsync.mutate(function() {
      parallaxMutate();
      fadeInMutate();
      scaleMutate();
    });
  }

  function isInView(rec, viewport) {
      return rec.bottom >= 0 && rec.top <= viewport.getHeight();
  }
};

