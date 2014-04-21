define(
    ['grobo/lib', 'grobo/helpers/geom', 'grobo/helpers/style'],
    function (lib, geom, styleHelper) {

        var refView = {

            canvas: null,
            parent: null,
            children: null,
            style: {},
            width: 0,
            height: 0,
            x: 0,
            y: 0,
            listeners: null,
            wasLastEventInside: false,

            _initView: function (config) {
                this.canvas             = config.canvas || null;
                this.style              = config.style || {};
                this.width              = config.width || 0;
                this.height             = config.height || 0;
                this.x                  = config.x || 0;
                this.y                  = config.y || 0;
                this.children           = [];
                this.listeners          = {
                    'click': [],
                    'press': [],
                    'release': [],
                    'move': [],
                    'over': [],
                    'out': []
                };
                this.wasLastEventInside = false;
                this.layout();
            },

            init: function (config) {
                this._initView(config);
                return this;
            },

            layout: function () {

                var style = this.style,
                    parent = this.parent || this.canvas,
                    styleWidth = style.width || '100%',
                    styleHeight = style.height || '100%',
                    parentWidth = parent ? parent.width : 0,
                    parentHeight = parent ? parent.height : 0,
                    width = Math.round(styleHelper.measureSize(styleWidth, parentWidth)),
                    height = Math.round(styleHelper.measureSize(styleHeight, parentHeight)),
                    left, right, top, bottom,
                    spacingLeft = style.spacingLeft || style.spacing,
                    spacingRight = style.spacingRight || style.spacing,
                    spacingTop = style.spacingTop || style.spacing,
                    spacingBottom = style.spacingBottom || style.spacing,
                    x, y;

                left = style.left !== undefined ? Math.round(styleHelper.measureSize(style.left, parentWidth)) : undefined;
                right = style.right !== undefined ? Math.round(styleHelper.measureSize(style.right, parentWidth)) : undefined;
                top = style.top !== undefined ? Math.round(styleHelper.measureSize(style.top, parentHeight)) : undefined;
                bottom = style.bottom !== undefined ? Math.round(styleHelper.measureSize(style.bottom, parentHeight)) : undefined;

                if (left !== undefined && right !== undefined) {
                    x = left;
                    width = (parentWidth - right) - x;
                } else if (left !== undefined) {
                    x = left;
                } else if (right !== undefined) {
                    x = parentWidth - width - right;
                } else {
                    x = Math.round((parentWidth - width) / 2);
                }

                if (top !== undefined && bottom !== undefined) {
                    y = top;
                    height = (parentHeight - bottom) - y;
                } else if (top !== undefined) {
                    y = top;
                } else if (bottom !== undefined) {
                    y = parentHeight - height - bottom;
                } else {
                    y = Math.round((parentHeight - height) / 2);
                }

                spacingLeft = spacingLeft !== undefined ? Math.round(styleHelper.measureSize(spacingLeft, parentWidth)) : undefined;
                spacingRight = spacingRight !== undefined ? Math.round(styleHelper.measureSize(spacingRight, parentWidth)) : undefined;
                spacingTop = spacingTop !== undefined ? Math.round(styleHelper.measureSize(spacingTop, parentHeight)) : undefined;
                spacingBottom = spacingBottom !== undefined ? Math.round(styleHelper.measureSize(spacingBottom, parentHeight)) : undefined;

                if (spacingLeft) {
                    x += spacingLeft;
                    width -= spacingLeft;
                }

                if (spacingRight) {
                    width -= spacingRight;
                }

                if (spacingTop) {
                    y += spacingTop;
                    height -= spacingTop;
                }

                if (spacingBottom) {
                    height -= spacingBottom;
                }

                if (width < 0) width = 0;
                if (height < 0) height = 0;

                this.x = x;
                this.y = y;
                this.width = width;
                this.height = height;

                lib.each(this.children, function (child) {
                    child.layout();
                });
            },

            addChild: function (view) {
                view.parent = this;
                view.canvas = this.canvas;
                view.layout();
                this.children.push(view);
                return this;
            },

            removeChild: function (view) {
                var i = this.children.indexOf(view);
                if (i !== -1) {
                    this.children.splice(i, 1);
                    view.parent = null;
                }
            },

            getWorldX: function () {
                return this.parent ? this.parent.getWorldX() + this.x : this.x;
            },

            getWorldY: function () {
                return this.parent ? this.parent.getWorldY() + this.y : this.y;
            },

            draw: function () {
                this.drawChildren();
            },  

            drawChildren: function () {
                lib.each(this.children, function (child) {
                    child.draw();
                });
            },

            on: function (eventName, fn) {
                var listeners = this.listeners[eventName],
                    i = listeners.indexOf(fn);
                if (i === -1)
                    listeners.push(fn);
            },

            off: function (eventName, fn) {
                var listeners = this.listeners[eventName],
                    i = listeners.indexOf(fn);
                if (i !== -1)
                    listeners.splice(i, 1);
            },

            handleInput: function (event) {
                switch (event.name) {
                    case 'click':
                        this.handleClick(event);
                        break;
                    case 'press':
                        this.handlePress(event);
                        break;
                    case 'release':
                        this.handleRelease(event);
                        break;
                    case 'move':
                        this.handleMove(event);
                        break;
                }
            },

            handleInputChildren: function (event) {
                lib.reverseUntil(this.children, function (child) {
                    child.handleInput(event);
                    return event.isConsumed;
                });
                return event.isConsumed;
            },

            isEventInside: function (event) {
                return geom.isPointInsideRect(
                    event.x, event.y,
                    this.getWorldX(), this.getWorldY(),
                    this.width, this.height
                );
            },

            handleClick: function (event) {
                if (!this.handleInputChildren(event)) {
                    this.triggerIfInside(event);
                }
            },

            handlePress: function (event) {
                if (!this.handleInputChildren(event)) {
                    this.triggerIfInside(event);
                }
            },

            handleRelease: function (event) {
                if (!this.handleInputChildren(event)) {
                    this.triggerIfInside(event);
                }
            },

            handleMove: function (event) {
                var isInside = this.isEventInside(event);
                if (!this.handleInputChildren(event)) {
                    if (isInside)
                        this.trigger(event);
                }
                
                if (!this.wasLastEventInside && isInside)
                    this.handleOver(event);
                else if (this.wasLastEventInside && !isInside)
                    this.handleOut(event);
                this.wasLastEventInside = isInside;
            },

            handleOver: function (event) {
                this.trigger({ name: 'over', source: event });
            },

            handleOut: function (event) {
                this.trigger({ name: 'out', source: event });
            },

            trigger: function (event) {
                var listeners = this.listeners[event.name];
                if (listeners && listeners.length > 0) {
                    lib.each(listeners, function (listener) {
                        listener(event);
                    });
                }
                /* this.draw(); */
            },

            triggerIfInside: function (event) {
                if (this.isEventInside(event))
                    this.trigger(event);
            }
        };

        return refView;
    }
);