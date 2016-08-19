/**!
 * easyPieChart
 * Lightweight plugin to render simple, animated and retina optimized pie charts
 *
 * @license
 * @author Robert Fleischmann <rendro87@gmail.com> (http://robert-fleischmann.de)
 * @version 2.1.5
 **/

(((root, factory) => {
    if(typeof exports === 'object') {
        module.exports = factory();
    }
    else if(typeof define === 'function' && define.amd) {
        define([], factory);
    }
    else {
        root['EasyPieChart'] = factory();
    }
})(this, () => {

    /**
     * Renderer to render the chart on a canvas object
     * @param {DOMElement} el      DOM element to host the canvas (root of the plugin)
     * @param {object}     options options object of the plugin
     */
    const CanvasRenderer = function(el, options) {
        let cachedBackground;
        const canvas = document.createElement('canvas');

        el.appendChild(canvas);

        if (typeof(G_vmlCanvasManager) !== 'undefined') {
            G_vmlCanvasManager.initElement(canvas);
        }

        const ctx = canvas.getContext('2d');

        canvas.width = canvas.height = options.size;

        // canvas on retina devices
        let scaleBy = 1;
        if (window.devicePixelRatio > 1) {
            scaleBy = window.devicePixelRatio;
            canvas.style.width = canvas.style.height = [options.size, 'px'].join('');
            canvas.width = canvas.height = options.size * scaleBy;
            ctx.scale(scaleBy, scaleBy);
        }

        // move 0,0 coordinates to the center
        ctx.translate(options.size / 2, options.size / 2);

        // rotate canvas -90deg
        ctx.rotate((-1 / 2 + options.rotate / 180) * Math.PI);

        let radius = (options.size - options.lineWidth) / 2;
        if (options.scaleColor && options.scaleLength) {
            radius -= options.scaleLength + 2; // 2 is the distance between scale and bar
        }

        // IE polyfill for Date
        Date.now = Date.now || (() => +(new Date()));

        /**
         * Draw a circle around the center of the canvas
         * @param {strong} color     Valid CSS color string
         * @param {number} lineWidth Width of the line in px
         * @param {number} percent   Percentage to draw (float between -1 and 1)
         */
        const drawCircle = (color, lineWidth, percent) => {
            percent = Math.min(Math.max(-1, percent || 0), 1);
            const isNegative = percent <= 0 ? true : false;

            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2 * percent, isNegative);

            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;

            ctx.stroke();
        };

        /**
         * Draw the scale of the chart
         */
        const drawScale = () => {
            let offset;
            let length;

            ctx.lineWidth = 1;
            ctx.fillStyle = options.scaleColor;

            ctx.save();
            for (let i = 24; i > 0; --i) {
                if (i % 6 === 0) {
                    length = options.scaleLength;
                    offset = 0;
                } else {
                    length = options.scaleLength * 0.6;
                    offset = options.scaleLength - length;
                }
                ctx.fillRect(-options.size/2 + offset, 0, length, 1);
                ctx.rotate(Math.PI / 12);
            }
            ctx.restore();
        };

        /**
         * Request animation frame wrapper with polyfill
         * @return {function} Request animation frame method or timeout fallback
         */
        const reqAnimationFrame = ((() => window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            (callback => {
                window.setTimeout(callback, 1000 / 60);
            }))());

        /**
         * Draw the background of the plugin including the scale and the track
         */
        const drawBackground = () => {
            if(options.scaleColor) drawScale();
            if(options.trackColor) drawCircle(options.trackColor, options.lineWidth, 1);
        };

        /**
         * Canvas accessor
         */
        this.getCanvas = () => canvas;

        /**
         * Canvas 2D context 'ctx' accessor
         */
        this.getCtx = () => ctx;

        /**
         * Clear the complete canvas
         */
        this.clear = () => {
            ctx.clearRect(options.size / -2, options.size / -2, options.size, options.size);
        };

        /**
         * Draw the complete chart
         * @param {number} percent Percent shown by the chart between -100 and 100
         */
        this.draw = percent => {
            // do we need to render a background
            if (!!options.scaleColor || !!options.trackColor) {
                // getImageData and putImageData are supported
                if (ctx.getImageData && ctx.putImageData) {
                    if (!cachedBackground) {
                        drawBackground();
                        cachedBackground = ctx.getImageData(0, 0, options.size * scaleBy, options.size * scaleBy);
                    } else {
                        ctx.putImageData(cachedBackground, 0, 0);
                    }
                } else {
                    this.clear();
                    drawBackground();
                }
            } else {
                this.clear();
            }

            ctx.lineCap = options.lineCap;

            // if barcolor is a function execute it and pass the percent as a value
            let color;
            if (typeof(options.barColor) === 'function') {
                color = options.barColor(percent);
            } else {
                color = options.barColor;
            }

            // draw bar
            drawCircle(color, options.lineWidth, percent / 100);
        };

        /**
         * Animate from some percent to some other percentage
         * @param {number} from Starting percentage
         * @param {number} to   Final percentage
         */
        this.animate = (from, to) => {
            const startTime = Date.now();
            options.onStart(from, to);
            const animation = () => {
                const process = Math.min(Date.now() - startTime, options.animate.duration);
                const currentValue = options.easing(this, process, from, to - from, options.animate.duration);
                this.draw(currentValue);
                options.onStep(from, to, currentValue);
                if (process >= options.animate.duration) {
                    options.onStop(from, to);
                } else {
                    reqAnimationFrame(animation);
                }
            };

            reqAnimationFrame(animation);
        };
    };

    const EasyPieChart = function(el, opts) {
        const defaultOptions = {
            barColor: '#ef1e25',
            trackColor: '#f9f9f9',
            scaleColor: '#dfe0e0',
            scaleLength: 5,
            lineCap: 'round',
            lineWidth: 3,
            size: 110,
            rotate: 0,
            animate: {
                duration: 1000,
                enabled: true
            },
            easing: function (x, t, b, c, d) { // more can be found here: http://gsgd.co.uk/sandbox/jquery/easing/
                t = t / (d/2);
                if (t < 1) {
                    return c / 2 * t * t + b;
                }
                return -c/2 * ((--t)*(t-2) - 1) + b;
            },
            onStart: function(from, to) {
                return;
            },
            onStep: function(from, to, currentValue) {
                return;
            },
            onStop: function(from, to) {
                return;
            }
        };

        // detect present renderer
        if (typeof(CanvasRenderer) !== 'undefined') {
            defaultOptions.renderer = CanvasRenderer;
        } else if (typeof(SVGRenderer) !== 'undefined') {
            defaultOptions.renderer = SVGRenderer;
        } else {
            throw new Error('Please load either the SVG- or the CanvasRenderer');
        }

        const options = {};
        let currentValue = 0;

        /**
         * Initialize the plugin by creating the options object and initialize rendering
         */
        const init = () => {
            this.el = el;
            this.options = options;

            // merge user options into default options
            for (const i in defaultOptions) {
                if (defaultOptions.hasOwnProperty(i)) {
                    options[i] = opts && typeof(opts[i]) !== 'undefined' ? opts[i] : defaultOptions[i];
                    if (typeof(options[i]) === 'function') {
                        options[i] = options[i].bind(this);
                    }
                }
            }

            // check for jQuery easing
            if (typeof(options.easing) === 'string' && typeof(jQuery) !== 'undefined' && jQuery.isFunction(jQuery.easing[options.easing])) {
                options.easing = jQuery.easing[options.easing];
            } else {
                options.easing = defaultOptions.easing;
            }

            // process earlier animate option to avoid bc breaks
            if (typeof(options.animate) === 'number') {
                options.animate = {
                    duration: options.animate,
                    enabled: true
                };
            }

            if (typeof(options.animate) === 'boolean' && !options.animate) {
                options.animate = {
                    duration: 1000,
                    enabled: options.animate
                };
            }

            // create renderer
            this.renderer = new options.renderer(el, options);

            // initial draw
            this.renderer.draw(currentValue);

            // initial update
            if (el.dataset && el.dataset.percent) {
                this.update(parseFloat(el.dataset.percent));
            } else if (el.getAttribute && el.getAttribute('data-percent')) {
                this.update(parseFloat(el.getAttribute('data-percent')));
            }
        };

        /**
         * Update the value of the chart
         * @param  {number} newValue Number between 0 and 100
         * @return {object}          Instance of the plugin for method chaining
         */
        this.update = newValue => {
            newValue = parseFloat(newValue);
            if (options.animate.enabled) {
                this.renderer.animate(currentValue, newValue);
            } else {
                this.renderer.draw(newValue);
            }
            currentValue = newValue;
            return this;
        };

        /**
         * Disable animation
         * @return {object} Instance of the plugin for method chaining
         */
        this.disableAnimation = function() {
            options.animate.enabled = false;
            return this;
        };

        /**
         * Enable animation
         * @return {object} Instance of the plugin for method chaining
         */
        this.enableAnimation = function() {
            options.animate.enabled = true;
            return this;
        };

        init();
    };


    return EasyPieChart;

}));
