import * as d3 from 'd3';
import './hue-range-widget.css';


/** @type {d3.ScaleLinear<radians, degrees, never>} */
const angleScale = d3.scaleLinear()
    .domain([0, 2 * Math.PI])
    .range([0, 360]);


class HueRange {
    static cap(angle) {
        return (angle + 360) % 360;
    }

    static norm(angle) {
        return this.cap(angle) / 360;
    }

    /**@param {HueWheel} wheel  */
    constructor(wheel) {
        this.wheel = wheel;

        this._start = 0;
        this._end = 360;
    };

    get start() {
        return this._start;
    }
    set start(angle) {
        if (angle < -180) {
            angle += 360;
        } else if (angle >= 360) {
            angle -= 360;
        }
        this._start = angle;

        this.wheel.knobLeft.style('rotate', angle + 'deg');
        this.wheel.container.style('--start', angle + 'deg');
        this.wheel.container.style('--angle', this.delta() + 'deg');
    }

    get end() {
        return this._end;
    }
    set end(angle) {
        if (angle <= 0) {
            angle += 360;
        } else if (angle > 540) {
            angle -= 360;
        }
        this._end = angle;

        this.wheel.knobRight.style('rotate', angle + 'deg');
        this.wheel.container.style('--angle', this.delta() + 'deg');
    }

    get center() {
        return ((this.delta() / 2) + this._start + 360) % 360;
    }
    set center(angle) {
        const center = this.center;
        const [start, end] = this.spread();
        const diff = angle - center;
        this._start = start + diff;
        this._end = end + diff;

        this.wheel.knobLeft.style('rotate', this._start + 'deg');
        this.wheel.knobRight.style('rotate', this._end + 'deg');

        this.wheel.container.style('--start', this._start + 'deg');
        this.wheel.container.style('--angle', this.delta() + 'deg');
    }

    reset() {
        this._start = 0;
        this._end = 360;

        this.wheel.knobLeft.style('rotate', 0 + 'deg');
        this.wheel.knobRight.style('rotate', 360 + 'deg');

        this.wheel.container.style('--start', 0 + 'deg');
        this.wheel.container.style('--angle', 360 + 'deg');
    }

    delta() {
        return (this._end + 360 - this._start) % 360 || 360;
    }

    spread() {
        let end = (this._end + 360) % 360;
        let start = end - this.delta();

        if (start < -180) {
            start += 360;
            end += 360;
        }

        return [start, end];
    }
}

export class HueWheel {
    /** @type {d3.Selection} */
    container;

    constructor(selector) {
        this.container = selector instanceof d3.selection ?
            selector :
            d3.select(selector);

        this.range = new HueRange(this);

        this.center = this.container
            .append('div')
            .classed('hue-wheel-center', true)
            .node();

        this.container
            .classed('hue-wheel', true)
            .datum(180)
            .on('wheel', this.wheelHandler.bind(this))
            .call(this.drag, 'wheel', this);

        this.knobLeft = this.container
            .append('div')
            .classed('hue-wheel-left', true)
            .datum(0)
            .call(this.drag, 'left', this);

        this.knobRight = this.container
            .append('div')
            .classed('hue-wheel-right', true)
            .datum(360)
            .call(this.drag, 'right', this);

        this.resetButton = this.container
            .append('div')
            .classed('hue-wheel-reset', true)
            .on('click', () => {
                this.range.reset();
                this.updateDatums();
            });
    }

    radius() {
        return this.container.node().getBoundingClientRect().width / 2;
    }

    /**
     * Polar angle of the event pointer
     * @param {PointerEvent|MouseEvent|d3.D3DragEvent} event 
     * @returns {number} angle in degrees measured 0 fron the top, rising clockwise
     */
    pointerAngle(event) {
        const [x, y] = d3.pointer(event, this.center);
        const radians = -Math.atan2(-x, -y);
        const degrees = angleScale(radians);
        return HueRange.cap(degrees);
    }

    updateDatums() {
        const center = this.range.center;
        const [start, end] = this.range.spread();

        this.container.datum(center);
        this.knobLeft.datum(start);
        this.knobRight.datum(end);
    }

    /**
     * 
     * @param {WheelEvent} event 
     */
    wheelHandler(event) {
        event.preventDefault();
        // console.log(event);
        let value = Math.round(event.deltaY / 100) || Math.sign(event.deltaY);
        if (event.altKey) value *= 10;

        const range = this.range;

        if (event.ctrlKey) {
            range.start += value;
            range.end -= value;
        } else {
            range.center += value;
        }

        this.updateDatums();
    }

    /**
     * 
     * @param {d3.Selection<HTMLDivElement,degrees>} handle 
     * @param {'left'|'right'|'wheel'} partType 
     * @param {this} self 
     * @returns 
     */
    drag(handle, partType, self) {
        const rerange = (() => {
            switch (partType) {
                case 'left':
                    return (value) => self.range.start = value;

                case 'right':
                    return (value) => self.range.end = value;

                case 'wheel':
                    return (value) => self.range.center = value;
            }
        })();

        const pointerAngle = self.pointerAngle.bind(self);
        const updateDatums = self.updateDatums.bind(self);

        let deltaAngle;

        function dragstart(event) {
            deltaAngle = pointerAngle(event) - handle.datum();
        }

        function dragging(event) {
            const currentAngle = pointerAngle(event) - deltaAngle;
            rerange(currentAngle);
            // console.log('angle: ', currentAngle);
        }

        function dragend(event) {
            updateDatums();
            // console.log(self.range.spread());
        }

        return d3.drag()
            .filter((event) => !event.target.classList.contains('hue-wheel-reset'))
            .on('start', dragstart)
            .on('drag', dragging)
            .on('end', dragend)
            (handle);
    }
}
