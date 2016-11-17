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
  const parallaxElements = global.document.querySelectorAll('*[parallax]');
  const fadeElements = global.document.querySelectorAll('*[fade]');
  for (let i = 0; i < fadeElements.length; i++) {
    st.setStyles(fadeElements[i], {
      'opacity': 0,
    });
  }

  const viewport = viewportForDoc(global.document);
  const vsync = vsyncFor(global);

  viewport.onScroll(schedule);

  function parallaxMutate() {
    for (let i = 0; i < parallaxElements.length; i++) {
      const element = parallaxElements[i];
      const rec = element.getBoundingClientRect();
      if (!isInView(rec, viewport)) {
        continue;
      };

      let factor = element.getAttribute('parallax');
      factor = factor ? parseFloat(factor) : 0.5;
      const top = viewport.getScrollTop();
      const newY = (top * factor).toFixed(2);
      st.setStyles(element, {
        transform: 'translate3d(0,' + newY + 'px,0)',
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

  function schedule() {
    vsync.mutate(function() {
      parallaxMutate();
      fadeInMutate();
    });
  }

  function isInView(rec, viewport) {
      return rec.bottom >= 0 && rec.top <= viewport.getHeight();
  }
};

