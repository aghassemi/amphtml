import {registerServiceBuilderForDoc} from '../service';
import {viewportForDoc, vsyncFor} from '../services';
import {getMode} from '../mode';
import {getIntersectionChangeEntry} from '../intersection-observer';

export const PositionObserverFidelity = {
  HIGHT: 1,
  LOW: 0,
};

class AbstractPositionObserver {

  constructor(ampdoc) {
    this.ampdoc_ = ampdoc;

    this.entries_ = [];

    this.vsync_ = vsyncFor(ampdoc.win);

    this.viewport_ = viewportForDoc(ampdoc);

    this.started_ = false;

    this.effectiveFidelity_ = PositionObserverFidelity.LOW;
  }

  add(element, minFidelity, handler) {

    // make entry into a class
    const entry = {
      element,
      handler,
      position: null,
      trigger: function(position) {
        if (!this.layoutRectEquals_(entry.position, position)) {
          entry.position = position;
          try {
            entry.handler(position);
          } catch (err) {}
        }
      },
    };

    this.entries_.push(entry);

    if (minFidelity > this.effectiveFidelity_) {
      this.effectiveFidelity_ = minFidelity;
      if (this.started_) {
        this.increaseFidelityCallback();
      }
    }


    if (!this.started_) {
      this.startCallback();
      this.started_ = true;
    }

  }

  remove(handler) {
    // TODO: When all handlers are gone, we need to call stopCallback()
    // TODO: When all HIGH fidelity handlers are gone we need to call
    // decreaseFidelityCallback() and set this.effectiveFidelity_ to LOW.
  }

    //TODO(aghassemi): Move to layout-rect.js as helper method
  layoutRectEquals_(l1, l2) {
    if (!l1 || !l2) {
      return false;
    }
    return l1.left == l2.left && l1.top == l2.top &&
        l1.width == l2.width && l1.height == l2.height;
  }


  startCallback() {}
  stopCallback() {}
  increaseFidelityCallback() {}
  decreaseFidelityCallback() {}

}

class AmpPagePositionObserver extends AbstractPositionObserver {

  constructor(ampdoc) {
    super(ampdoc);
  }

  /* @override */
  startCallback() {
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

      entry.trigger(position);
    }
  }
}

class InaboxPositionObserver extends AbstractPositionObserver {

  constructor(ampdoc) {
    super(ampdoc);
  }

  /* @override */
  startCallback() {
    // tell host I want data with this.effectiveFidelity_ fidelity
  }
}

function isInabox(ampdoc) {
  return getMode(ampdoc.win).runtime == 'inabox';
}

/**
 * @param {!./ampdoc-impl.AmpDoc} ampdoc
 */
export function installPositionObserverServiceForDoc(ampdoc) {
  registerServiceBuilderForDoc(ampdoc, 'position-observer', () => {
    if (isInabox(ampdoc)) {
      return new AmpPagePositionObserver(ampdoc);
    } else {
      return new InaboxPagePositionObserver(ampdoc);
    }
  });
}
