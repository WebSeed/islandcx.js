define(['lib', 'ui/view'], function (lib, refView) { 

    function createMockEvent(x, y, name) {
        return {
            name: (name || 'click'),
            x: (x || 0),
            y: (y || 0),
            isConsumed: false,
            consume: function () {
                this.isConsumed = true;
            }
        };
    }

    var view;

    describe('View', function () {

        beforeEach(function () {
            view = lib.create(refView);
        });

        it('should return "this" on init', function () {
            var view2 = view.init({ canvas: null });
            expect(view2).toEqual(view);
        });

        it('should be able to initialise with the canvas and parent view', function () {
            var parent = lib.create(refView),
                canvas = {};
            view.init({
                canvas: canvas,
                parent: parent
            });
            expect(view.canvas).toEqual(canvas);
            expect(view.parent).toEqual(parent);
        });

        it('should be able to initialise with dimensions and an (x, y) coordinate', function () {
            var config = {
                canvas: {},
                parent: lib.create(refView),
                width: 400,
                height: 300,
                x: 5,
                y: 10
            };
            view.init(config);
            expect(view.width).toEqual(400);
            expect(view.height).toEqual(300);
            expect(view.x).toEqual(5);
            expect(view.y).toEqual(10);
        });

        it('should default (x, y) coordinate to (0, 0)', function () {
            var config = {
                canvas: {},
                parent: lib.create(refView),
                width: 100,
                height: 100
            };
            view.init(config);
            expect(view.x).toEqual(0);
            expect(view.y).toEqual(0);
        });

        describe('child view management', function () {

            it('should be able to chain add', function () {
                view.init({});
                view.addChild(lib.create(refView)).addChild(lib.create(refView));
                expect(view.children.length).toEqual(2);
            });

            it('should set the child\'s parent on add', function () {
                var child = lib.create(refView);
                view.init({});
                view.addChild(child);
                expect(child.parent).toEqual(view);
            });

            it('should be able to remove', function () {
                var child1 = lib.create(refView),
                    child2 = lib.create(refView),
                    child3 = lib.create(refView);
                view.init({});
                view.addChild(child1).addChild(child2).addChild(child3);
                expect(view.children.length).toEqual(3);
                view.removeChild(child2);
                expect(view.children.length).toEqual(2);
                expect(view.children[0]).toEqual(child1);
                expect(view.children[1]).toEqual(child3);
            });

            it('should unset the child\'s parent on remove', function () {
                var child = lib.create(refView);
                view.init({});
                view.addChild(child);
                view.removeChild(child);
                expect(child.parent).toBeNull();
            });
        });

        describe('world coordinates', function () {

            it('should be relative to that of own local coordinates and the parent', function () {
                var parentsParentView = lib.create(refView).init({
                    canvas: {},
                    parent: null,
                    x: 100,
                    y: 200
                }),
                parentView = lib.create(refView).init({
                    canvas: {},
                    parent: parentsParentView,
                    x: 300,
                    y: 400
                });
                view.init({
                    canvas: {},
                    parent: parentView,
                    x: 500,
                    y: 600
                });
                expect(view.getWorldX()).toEqual(900);
                expect(view.getWorldY()).toEqual(1200);
            });

        });

        describe('draw', function () {

            it('should draw child views', function () {
                view.init({ canvas: null });
                spyOn(view, 'drawChildren');
                view.draw();
                expect(view.drawChildren).toHaveBeenCalled();
            });

            it('should invoke "draw" on all children when drawing all children', function () {
                var child1 = lib.create(refView),
                    child2 = lib.create(refView),
                    child3 = lib.create(refView);
                spyOn(child1, 'draw');
                spyOn(child2, 'draw');
                spyOn(child3, 'draw');
                view.init({});
                view.addChild(child1).addChild(child2).addChild(child3);
                view.draw();
                expect(child1.draw).toHaveBeenCalled();
                expect(child2.draw).toHaveBeenCalled();
                expect(child3.draw).toHaveBeenCalled();
            });
        });

        describe('input', function () {

            it('should pass "click" events to children until consumed', function () {

                var callTrace = '',
                    child1 = { handleInput: function (event) { callTrace += '[child1]'; } },
                    child2 = { handleInput: function (event) { callTrace += '[child2]'; event.consume(); } },
                    child3 = { handleInput: function (event) { callTrace += '[child3]'; } },
                    mockEvent = createMockEvent();
                view.init({});
                view.addChild(child1).addChild(child2).addChild(child3);
                view.handleClick(mockEvent);
                expect(callTrace).toEqual('[child3][child2]');
            });

            it('should send unconsumed "click" events inside the view to "onClick" listeners', function () {

                var callTrace = '',
                    clickX = 11, clickY = 11,
                    mockEvent = createMockEvent(clickX, clickY);
                view.init({
                    x: 10, y: 10,
                    width: 2, height: 2
                });
                view.onClick(function (event) {
                    callTrace += '[click1]';
                });
                view.onClick(function (event) {
                    callTrace += '[click2]';
                });
                view.handleClick(mockEvent);
                expect(callTrace).toEqual('[click1][click2]');
            });

            it('should provide a single method for handling events (which in-turn delegates to specific methods)', function () {

                var mockClickEvent = createMockEvent(0, 0, 'click'),
                    mockTouchDownEvent = createMockEvent(0, 0, 'touchDown'),
                    mockTouchUpEvent = createMockEvent(0, 0, 'touchup');
                view.init({});
                spyOn(view, 'handleClick');
                view.handleInput(mockClickEvent);
                view.handleInput(mockTouchDownEvent);
                view.handleInput(mockTouchUpEvent);
                expect(view.handleClick).toHaveBeenCalledWith(mockClickEvent);
            });
        });

        describe('event binding', function () {

            it('should be able to bind and unbind listeners to "click" events', function () {
                var hasClicked1 = false, hasClicked2 = false, hasClicked3 = false,
                    callback1 = function (event) { hasClicked1 = true; },
                    callback2 = function (event) { hasClicked2 = true; },
                    callback3 = function (event) { hasClicked3 = true; },
                    clickX = 150, clickY = 150,
                    mockEvent = createMockEvent(clickX, clickY);
                view.init({
                    x: 100, y: 100,
                    width: 100, height: 100
                });
                view.onClick(callback1);
                view.onClick(callback2);
                view.onClick(callback3);
                view.offClick(callback2);
                view.handleClick(mockEvent);
                expect(hasClicked1).toBeTruthy();
                expect(hasClicked2).toBeFalsy();
                expect(hasClicked3).toBeTruthy();
            });
        });
    });
});