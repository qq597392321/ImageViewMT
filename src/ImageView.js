﻿/*
概括:
    图片查看器，带有分页功能、双指缩放、多选删除、头像截取
*/
(function () {
    /*
        兼容处理
    */
    //数据类型判断
    function isType(obj, name) {
        return Object.prototype.toString.call(obj).toLowerCase() == '[object ' + name.toLowerCase() + ']';
    };
    //判断是否具有指定样式类
    HTMLElement.prototype.hasClass = function (name) {
        var c = this.className.split(' ');
        for (var i = c.length - 1; i >= 0; i--) {
            if (c[i].toLowerCase() == name.toLowerCase()) {
                return true;
            }
        }
        return false;
    }
    //添加样式类
    HTMLElement.prototype.addClass = function (name) {
        var list1 = name.split(' ');
        var list2 = this.className.split(' ');
        list1.forEach(function (item, i) {
            var index = list2.indexOf(item);
            if (index === -1) {
                list2.push(item);
            }
        });
        this.className = list2.join(' ');
        return this;
    };
    //删除样式类
    HTMLElement.prototype.removeClass = function (name) {
        var list1 = name.split(' ');
        var list2 = this.className.split(' ');
        list1.forEach(function (item) {
            var index = list2.indexOf(item);
            if (index > -1) {
                list2.splice(index, 1);
            }
        });
        this.className = list2.join(' ');
        return this;
    };
    //删除自己
    HTMLElement.prototype.remove = function () {
        this.parentNode.removeChild(this);
        return this;
    };
    //indexOf增强版，可以指定多级属性
    Array.prototype.indexOf2 = function (value, property) {
        var list = property && property.split('.');
        var length = (list && list.length) || 0;
        var index = -1;
        var temporary;
        for (var i = 0; i < this.length; i++) {
            var temporary = this[i];
            for (var z = 0; z < length; z++) {
                if (typeof temporary === 'object' || typeof temporary === 'function') {
                    if (list[z] !== '') {
                        temporary = temporary[list[z]];
                    }
                } else {
                    temporary = null;
                    break;
                }
            }
            if (temporary === value) {
                return i;
            }
        }
        return index;
    };
    //绘制圆角矩形
    CanvasRenderingContext2D.prototype.radiusRect = function (width, height, r1, r2, r3, r4) {
        var s = this;
        s.beginPath();
        s.moveTo(0, height - r1);
        s.arcTo(0, 0, width, 0, r1);
        s.arcTo(width, 0, width, height, r2);
        s.arcTo(width, height, 0, height, r4);
        s.arcTo(0, height, 0, 0, r3);
        s.closePath();
        return s;
    };
    /*
        监听器
    */
    var Listeners = function () {
        var s = this;
        //公用变量名
        s.publicName1 = '__ListenersisRegistered__';
        s.publicName2 = '__ListenersCallbackList__';
    };
    //注册监听器
    Listeners.prototype.register = function (object) {
        var s = this;
        if (!object[s.publicName1]) {
            object[s.publicName1] = true;
            object[s.publicName2] = object[s.publicName2] || {};
            object.dispatchEvent = s.dispatchEvent.bind(object);
            object.on = object.addEventListener = s.addEventListener.bind(object);
            object.off = object.removeEventListener = s.removeEventListener.bind(object);
        }
    };
    //删除监听器
    Listeners.prototype.remove = function (object) {
        var s = this;
        object[s.publicName1] = false;
        object[s.publicName2] = null;
        object.dispatchEvent = null;
        object.on = object.addEventListener = null;
        object.off = object.removeEventListener = null;
    };
    //事件派送
    Listeners.prototype.dispatchEvent = function (type, data, phase) {
        var s = this;
        phase = phase || 1;
        type = type.toLowerCase();
        if (s[Listeners.publicName2][phase]) {
            var list = s[Listeners.publicName2][phase][type];
            if (list) {
                list.forEach(function (item) {
                    item.call(s, data);
                });
            }
        }
        var typeName = type.toLowerCase().replace(/^([a-z])/g, type[0].toUpperCase());
        if (s['on' + typeName] && isType(s['on' + typeName], 'function')) {
            s['on' + typeName].call(s, data);
        }
    };
    //添加事件监听
    Listeners.prototype.addEventListener = function (type, callback, phase) {
        var s = this;
        phase = phase || 1;
        type = type.toLowerCase();
        s[Listeners.publicName2][phase] = s[Listeners.publicName2][phase] || {};
        s[Listeners.publicName2][phase][type] = s[Listeners.publicName2][phase][type] || [];
        s[Listeners.publicName2][phase][type].push(callback);
    };
    //删除事件监听
    Listeners.prototype.removeEventListener = function (type, callback, phase) {
        var s = this;
        phase = phase || 1;
        type = type.toLowerCase();
        if (s[Listeners.publicName2][phase] && s[Listeners.publicName2][phase][type]) {
            var list = s[Listeners.publicName2][phase][type];
            if (typeof callback === 'string' && callback.toLowerCase() === 'all') {
                list.length = 0;
            } else {
                var i = list.indexOf(callback);
                if (i !== -1) { list.splice(i, 1); }
            }
        }
    };
    Listeners = new Listeners();
    /*
        速度衰减动画
    */
    function SpeedDecay(from, speed) {
        var s = this;
        //开始值列表
        s.fromValue = {};
        //当前值列表
        s.currValue = {};
        //速度/100ms
        s.initSpeed = {};
        //摩擦系数
        s.friction = .9;
        //最低速度
        s.minSpeed = .5;
        //状态(pauseing为暂停中,running为播放中,idle为闲置)
        s.state = 'idle';
        //节点时间
        s._nodeTime = 0;
        //节点值
        s._nodeValue = {};
        //节点速度
        s._nodeSpeed = null;
        //暂停时间戳
        s._pauseTimesTamp = 0;
        //数据更新定时器
        s._DataUpdateTimer = null;
        //绑定上下文
        s.start = s.start.bind(s);
        //初始化
        s.init(from);
        //注册监听器
        Listeners.register(s);
    };
    //初始化
    SpeedDecay.prototype.init = function (from) {
        var s = this;
        s.state = 'idle';
        s.fromValue = from || {};
        s._nodeTime = Date.now();
        s._nodeValue = {};
        for (var name in s.fromValue) {
            s._nodeValue[name] = s.fromValue[name];
        }
    };
    //动画更新
    SpeedDecay.prototype.start = function () {
        var s = this;
        if (s.state !== 'pauseing') {
            s.state = 'running';
            s._DataUpdateTimer = requestAnimationFrame(s.start);
            var currSpeed = 0;
            var currValue = {};
            var currTime = Date.now() - s._nodeTime;
            if (s._nodeSpeed === null) {
                s._nodeSpeed = s.initSpeed;
            }
            if (currTime < 100) {
                currSpeed = currTime / 100 * s._nodeSpeed;
            } else {
                for (var name in s.fromValue) {
                    if (s.fromValue.hasOwnProperty(name)) {
                        s._nodeValue[name] += s._nodeSpeed;
                    }
                }
                s._nodeTime += 100;
                s._nodeSpeed *= s.friction;
                currSpeed = (currTime - 100) / 100 * s._nodeSpeed;
            }
            for (var name in s.fromValue) {
                if (s.fromValue.hasOwnProperty(name)) {
                    currValue[name] = s._nodeValue[name] + currSpeed;
                }
            }
            s.dispatchEvent('update', currValue);
            if (Math.abs(s._nodeSpeed) <= s.minSpeed) {
                s.stopTimer();
                s.dispatchEvent('complete');
            }
        }
    };
    //暂停/继续
    SpeedDecay.prototype.pause = function () {
        var s = this;
        if (s.state === 'running') {
            s.stopTimer();
            s.state = 'pauseing';
            s._pauseTimesTamp = Date.now();
        } else if (s.state === 'pauseing') {
            s.state = 'running';
            s._nodeTime += Date.now() - s._pauseTimesTamp;
            s.start();
        }
    };
    //停止计时器
    SpeedDecay.prototype.stopTimer = function () {
        var s = this;
        s.state = 'idle';
        s._nodeSpeed = null;
        cancelAnimationFrame(s._DataUpdateTimer);
    };
    /*
        缓动动画类
    */
    function Animation(from, to) {
        var s = this;
        //开始值列表
        s.fromList = {};
        //结束值列表
        s.toList = {};
        //开始时间
        s.startTime = 0;
        //持续时间
        s.duration = 1000;
        //状态(pauseing为暂停中,running为播放中,idle为闲置)
        s.state = 'idle';
        //记录暂停时间戳
        s._pauseTimesTamp = null;
        //数据更新定时器
        s._DataUpdateTimer = null;
        //绑定上下文
        s.start = s.start.bind(s);
        //初始化
        s.init(from, to);
        //注册监听器
        Listeners.register(s);
    };
    //初始化
    Animation.prototype.init = function (from, to) {
        var s = this;
        s.state = 'idle';
        s.fromList = from || {};
        s.toList = to || {};
        s.startTime = Date.now();
    };
    //动画更新
    Animation.prototype.start = function () {
        var s = this;
        var res = {};
        var currTime = Date.now() - s.startTime;
        if (s.state !== 'pauseing') {
            s.state = 'running';
            s._DataUpdateTimer = requestAnimationFrame(s.start);
            if (currTime < s.duration) {
                for (var name in s.fromList) {
                    if (s.fromList.hasOwnProperty(name)) {
                        res[name] = s.easing(currTime, s.fromList[name], s.toList[name] - s.fromList[name], s.duration);
                    }
                }
                s.dispatchEvent('update', res);
            } else {
                s.stopTimer();
                s.dispatchEvent('update', s.toList);
                s.dispatchEvent('complete');
            }
        }
    };
    //暂停/继续
    Animation.prototype.pause = function () {
        var s = this;
        if (s.state === 'running') {
            s.stopTimer();
            s.state = 'pauseing';
            s._pauseTimesTamp = Date.now();
        } else if (s.state === 'pauseing') {
            s.state = 'running';
            s.startTime += Date.now() - s._pauseTimesTamp;
            s.start();
        }
    };
    //停止计时器
    Animation.prototype.stopTimer = function () {
        var s = this;
        s.state = 'idle';
        cancelAnimationFrame(s._DataUpdateTimer);
    };
    //动画算法
    Animation.prototype.easing = function (t, b, c, d) { return c * ((t = t / d - 1) * t * t + 1) + b; };
    /*
        图片查看器
    */
    //翻页动画
    var _PageFx = new Animation();
    //还原缩放状态动画
    var _RestoreFx = new Animation();
    _RestoreFx.on('complete', function () {
        SignPageing = false;
        _RestoreFx.onUpdate = null;
    });
    //还原图片位置动画
    var _RestoreFx_X = new Animation();
    var _RestoreFx_Y = new Animation();
    //滚屏动画
    var _ScrollFx_X = new SpeedDecay();
    var _ScrollFx_Y = new SpeedDecay();
    /*
        图像类
    */
    function Vimg(json) {
        var s = this;
        //dom元素
        s.image = null;
        //矩形盒子
        s.getClientRects = null;
        //图片地址
        s.src = '';
        //目标元素
        s.target = null;
        //位置
        s.position = { x: 0, y: 0 };
        //缩放前的位置
        s.firstPosition = { x: 0, y: 0 };
        //缩放后的位置
        s.lastPosition = { x: 0, y: 0 };
        //锚点
        s.anchor = { x: 0, y: 0 };
        //未进行缩放前的锚点
        s.lastAnchor = { x: 0, y: 0 };
        //宽度
        s.width = 0;
        //高度
        s.height = 0;
        //真实宽度
        s.naturalWidth = 0;
        //真实高度
        s.naturalHeight = 0;
        //当前旋转值
        s.rotate = 0;
        //当前缩放值
        s.scale = 1;
        //缩放前的缩放值
        s.lastScale = 1;
        //最大缩放倍数
        s.maxScale = 1;
        //最小缩放倍数
        s.minScale = 1;
        //图片间距
        s.imageMargin = 20;
        //位于存放列表下标位置
        s.index = 0;
        //是否被选中
        s.selected = false;
        //应用
        for (var name in json) {
            if (s.hasOwnProperty(name) && name in s) {
                s[name] = json[name];
            }
        }
    };
    //居中显示
    Vimg.prototype.centered = function () {
        var s = this;
        s.left = ImageView.width * s.index + s.index * s.imageMargin;
        s.position.x = Math.round((ImageView.width - s.width) / 2);
        s.position.y = Math.round((ImageView.height - s.height) / 2);
        s.adjustPosition();
    };
    //适应父容器大小
    Vimg.prototype.adaptContainerSize = function () {
        var s = this;
        if (ImageView.pattern === 'clipping') {
            s.width = ImageView.width;
            s.height = s.width / s.naturalWidth * s.naturalHeight;
        } else {
            var width = Math.round(ImageView.height / s.naturalHeight * s.naturalWidth);
            var height = Math.round(ImageView.width / s.naturalWidth * s.naturalHeight);
            if (width < ImageView.width) {
                s.width = width;
                s.height = ImageView.height;
            } else if (height < ImageView.height) {
                s.width = ImageView.width;
                s.height = height;
            }
        }
        s.maxScale = 2;
    };
    //应用数据到dom元素
    Vimg.prototype.useDataToImage = function () {
        var s = this;
        if (s.image) {
            s.image.style.zIndex = 2;
            s.image.style.width = s.width + 'px';
            s.image.style.height = s.height + 'px';
            s.image.style.left = s.left + 'px';
            s.image.style.top = s.top + 'px';
            s.image.style.webkitTransform = s.image.style.transform = 'translate3d(' + s.position.x + 'px, ' + s.position.y + 'px, 0) scale3d(' + s.scale + ',' + s.scale + ',1) rotateZ(' + s.rotate + 'deg)';
        }
    };
    //调整显示位置
    Vimg.prototype.adjustPosition = function (isinit) {
        var s = this;
        var x = s.position.x;
        var y = s.position.y;
        var scale = s.scale;
        var rotate = s.rotate;
        var isAnimate = false;
        if (isinit) {
            //还原到初始状态
            scale = 1;
            rotate = 0;
            x = (ImageView.width - s.width) / 2;
            y = (ImageView.height - s.height) / 2;
        } else {
            if (s.scale > 1) {
                if (s.lastScale < 1) {
                    //如果上一次缩放比例小于1，则最大缩放比例为1
                    scale = 1;
                    x = s.firstPosition.x;
                    y = s.firstPosition.y;
                } else if (s.scale > s.maxScale) {
                    //如果当前缩放比例大于最大放大比例，则还原到最大比例，原点居中
                    scale = s.maxScale;
                    x = _DisplayRectBox.x + s.lastAnchor.x * (1 - scale);
                    y = _DisplayRectBox.y + s.lastAnchor.y * (1 - scale);
                }
            } else if (s.scale < 1) {
                if (s.lastScale > 1) {
                    //如果上一次缩放比例大于1，则最小缩放比例为1
                    scale = 1;
                    x = s.firstPosition.x;
                    y = s.firstPosition.y;
                } else if (s.scale < s.minScale) {
                    //如果当前缩放比例小于最小缩放比例，则还原到最小缩放，原点居中
                    scale = s.minScale;
                }
            }
            var currentWidth = s.width * scale;
            var currentHeight = s.height * scale;
            if (currentWidth > _DisplayRectBox.width) {
                var maxX = -(currentWidth - _DisplayRectBox.width - _DisplayRectBox.x);
                if (x > _DisplayRectBox.x) {
                    x = _DisplayRectBox.x;
                } else if (x < maxX) {
                    x = maxX;
                }
            } else {
                x = (ImageView.width - currentWidth) / 2;
            }
            if (currentHeight > _DisplayRectBox.height) {
                var maxY = -(currentHeight - _DisplayRectBox.height - _DisplayRectBox.y);
                if (y > _DisplayRectBox.y) {
                    y = _DisplayRectBox.y;
                } else if (y < maxY) {
                    y = maxY;
                }
            } else {
                y = (ImageView.height - currentHeight) / 2;
            }
        }
        rotate = 0;
        if (s.width * scale >= ImageView.width) {
            s.lastPosition.x = 0;
        } else {
            s.lastPosition.x = x;
        }
        if (s.height * scale >= ImageView.height) {
            s.lastPosition.y = 0;
        } else {
            s.lastPosition.y = y;
        }
        //初始化X轴动画
        if (s.position.x !== x && _ScrollFx_X.state !== 'running') {
            _RestoreFx_X.init({ x: s.position.x, }, { x: x });
            _RestoreFx_X.duration = 300;
            _RestoreFx_X.onUpdate = function (data) {
                s.position.x = data.x;
            };
            _RestoreFx_X.start();
        }
        //初始化Y轴动画
        if (s.position.y !== y && _ScrollFx_Y.state !== 'running') {
            _RestoreFx_Y.init({ y: s.position.y, }, { y: y });
            _RestoreFx_Y.duration = 300;
            _RestoreFx_Y.onUpdate = function (data) {
                s.position.y = data.y;
            };
            _RestoreFx_Y.start();
        }
        //初始化动画
        _RestoreFx.init({
            scale: s.scale,
            rotate: s.rotate
        }, {
            scale: scale,
            rotate: rotate
        });
        _RestoreFx.duration = 300;
        _RestoreFx.onUpdate = function (data) {
            s.scale = data.scale;
            s.rotate = data.rotate;
            s.useDataToImage();
        };
        _RestoreFx.start();
    };
    //当图片宽高大于容器时，启用滑动滚屏
    Vimg.prototype.scrollScreen = function (speed, touch) {
        var s = this;
        var horDirection = touch.horDirection;
        var verDirection = touch.verDirection;
        //当前宽高
        var imageWidth = s.width * s.scale;
        var imageHeight = s.height * s.scale;
        //初始位置
        var initViewBoxPositionX = _ViewBoxPositionX;
        var initPositionX = s.position.x;
        var initPositionY = s.position.y;
        //阻尼系数
        var damping = .3;
        var friction = .8;
        //摩擦系数增量
        var incrementX = 1;
        var incrementY = 1;
        //当前页数显示盒子的初始位置
        var ViewBoxInitDataX = -(ImageView.width + ImageView.imageMargin) * (ImageView.page - 1);
        //x轴动画
        if (Math.abs(speed.x) > _ScrollFx_X.minSpeed) {
            _ScrollFx_X.init({ x: s.position.x });
            _ScrollFx_X.initSpeed = speed.x;
            _ScrollFx_X.friction = friction;
            _ScrollFx_X.onUpdate = function (data) {
                var posX = data.x;
                var pageX = ViewBoxInitDataX;
                //边界外最大左超出量
                var maxBeyond = imageWidth - _DisplayRectBox.width;
                //边界外左右超出量
                var leftBeyond = _DisplayRectBox.x - posX;
                var rightBeyond = maxBeyond - leftBeyond;
                //当前模式
                if (ImageView.pattern === 'clipping') {
                    //判断滑动方向
                    if (_ScrollFx_X.initSpeed < 0) {
                        //往左滑动
                        if (rightBeyond <= 0) {
                            //边界内右超出量
                            var rightinBeyond = posX + maxBeyond - _DisplayRectBox.x;
                            if (initPositionX < -(maxBeyond - _DisplayRectBox.x)) {
                                posX = -maxBeyond + ((initPositionX + maxBeyond) / damping + (posX - initPositionX)) * damping;
                            } else {
                                posX = _DisplayRectBox.x - maxBeyond + rightinBeyond * damping;
                            }
                            _ScrollFx_X.friction *= incrementX;
                            if (incrementX === 1) {
                                incrementX = _ScrollFx_X.friction * .7;
                            }
                        }
                    } else {
                        //往右滑动
                        if (leftBeyond <= 0) {
                            //边界内上超出量
                            var leftinBeyond = posX - _DisplayRectBox.x;
                            if (initPositionX > _DisplayRectBox.x) {
                                posX = (initPositionX / damping + (posX - initPositionX)) * damping;
                            } else {
                                posX = _DisplayRectBox.x + leftinBeyond * damping;
                            }
                            _ScrollFx_X.friction *= incrementX;
                            if (incrementX === 1) {
                                incrementX = _ScrollFx_X.friction * .7;
                            }
                        }
                    }
                } else {
                    //判断滑动方向
                    if (_ScrollFx_X.initSpeed < 0) {
                        //往左滑动
                        if (rightBeyond <= 0) {
                            //边界内右超出量
                            var rightinBeyond = posX + maxBeyond;
                            if (initViewBoxPositionX < ViewBoxInitDataX) {
                                pageX = ViewBoxInitDataX + ((initViewBoxPositionX - ViewBoxInitDataX) / damping + (posX - _ScrollFx_X.fromValue.x)) * damping;
                            } else {
                                pageX = ViewBoxInitDataX + rightinBeyond * damping;
                            }
                            posX = -maxBeyond;
                            _ScrollFx_X.friction *= incrementX;
                            if (incrementX === 1) {
                                incrementX = _ScrollFx_X.friction * .1;
                            }
                        } else if (initViewBoxPositionX > ViewBoxInitDataX) {
                            _ScrollFx_X.friction *= incrementX;
                            pageX = initViewBoxPositionX + posX;
                            posX = 0;
                            if (incrementX === 1) {
                                incrementX = _ScrollFx_X.friction * .05;
                            }
                        }
                    } else {
                        //往右滑动
                        if (leftBeyond <= 0) {
                            //边界内左超出量
                            var leftinBeyond = posX;
                            _ScrollFx_X.friction *= incrementX;
                            if (initViewBoxPositionX > ViewBoxInitDataX) {
                                pageX = ViewBoxInitDataX + ((initViewBoxPositionX - ViewBoxInitDataX) / damping + posX) * damping;
                            } else {
                                pageX = ViewBoxInitDataX + leftinBeyond * damping;
                            }
                            posX = 0;
                            if (incrementX === 1) {
                                incrementX = _ScrollFx_X.friction * .1;
                            }
                        } else if (initViewBoxPositionX < ViewBoxInitDataX) {
                            _ScrollFx_X.friction *= incrementX;
                            pageX = initViewBoxPositionX - (-maxBeyond - posX);
                            posX = -maxBeyond;
                            if (incrementX === 1) {
                                incrementX = _ScrollFx_X.friction * .05;
                            }
                        }
                    }
                }
                s.position.x = posX;
                _ViewBoxPositionX = pageX;
                s.useDataToImage();
                setViewBoxPositionX();
            };
            _ScrollFx_X.onComplete = function () {
                ImageView.indexPage(ImageView.page);
            };
            _ScrollFx_X.start();
        }
        //y轴动画
        if (Math.abs(speed.y) > _ScrollFx_X.minSpeed) {
            //y轴动画
            _ScrollFx_Y.init({ y: s.position.y });
            _ScrollFx_Y.initSpeed = speed.y;
            _ScrollFx_Y.friction = friction;
            _ScrollFx_Y.onUpdate = function (data) {
                //边界外最大下超出量
                var maxBeyond = imageHeight - _DisplayRectBox.height;
                //边界外上下超出量
                var topBeyond = _DisplayRectBox.y - data.y;
                var bottomBeyond = maxBeyond - topBeyond;
                //判断滑动方向
                if (verDirection === 'top') {
                    if (bottomBeyond <= 0) {
                        //边界内下超出量
                        var bottominBeyond = data.y + maxBeyond - _DisplayRectBox.y;
                        if (initPositionY < -(maxBeyond - _DisplayRectBox.y)) {
                            data.y = -maxBeyond + ((initPositionY + maxBeyond) / damping + (data.y - initPositionY)) * damping;
                        } else {
                            data.y = _DisplayRectBox.y - maxBeyond + bottominBeyond * damping;
                        }
                        _ScrollFx_Y.friction *= incrementY;
                        if (incrementY === 1) {
                            incrementY = _ScrollFx_Y.friction * .7;
                        }
                    }
                } else if (verDirection === 'bottom') {
                    if (topBeyond <= 0) {
                        //边界内上超出量
                        var topinBeyond = data.y - _DisplayRectBox.y;
                        if (initPositionY > _DisplayRectBox.y) {
                            data.y = (initPositionY / damping + (data.y - initPositionY)) * damping;
                        } else {
                            data.y = _DisplayRectBox.y + topinBeyond * damping;
                        }
                        _ScrollFx_Y.friction *= incrementY;
                        if (incrementY === 1) {
                            incrementY = _ScrollFx_Y.friction * .7;
                        }
                    }
                }
                s.position.y = data.y;
                s.useDataToImage();
            };
            _ScrollFx_Y.onComplete = function () {
                ImageView.indexPage(ImageView.page);
            };
            _ScrollFx_Y.start();
        }
        if (speed.x === 0 && speed.y === 0) {
            ImageView.indexPage(ImageView.page);
        }
    };
    //显示盒子位置
    var _ViewBoxPositionX = 0;
    //动画播放标记
    var _AnimatePlaySign = false;
    //显示区域矩形盒子
    var _DisplayRectBox = {};
    //元素
    var _Element = (function () {
        return {
            //容器
            container: null,
            //关闭按钮
            iv_closebtn: null,
            //关闭按钮
            iv_title: null,
            //关闭按钮
            iv_delbtn: null,
            //确定按钮
            iv_confbtn: null,
            //多选按钮
            iv_checkalone: null,
            //中间栏
            iv_view: null,
            //显示盒子
            iv_viewBox: null,
            //头部栏
            iv_head: null,
            //底部栏
            iv_bottom: null
        };
    })();
    //图片查看器
    function ImageView() {
        var s = this;
        //容器大小
        s.width = window.innerWidth;
        s.height = window.innerHeight;
        //当前页
        s.page = 1;
        //图片列表
        s.vImageList = null;
        //选择器
        s.selector = null;
        //当前模式(默认：default 可选：edit(编辑) clipping(剪裁))
        s.pattern = null;
        //图片间距(默认：10)
        s.imageMargin = null;
        //裁剪后输出的图片宽度(默认：容器宽度)
        s.clippingWidth = null;
        //裁剪后输出的图片高度(默认：容器宽度)
        s.clippingHeight = null;
        //裁剪图片的圆角数值(默认：0)
        s.clippingRadius = null;
        //裁剪后输出的图片背景(默认：透明)
        s.clippingBackground = null;
        //裁剪后输出的图片后缀(默认：png 可选：jpge)
        s.clippingImportSuffix = null;
        //手势事件是否能进行旋转(默认：false 可选：true)
        s.isGestureRotate = null;
        //注册监听器
        Listeners.register(s);
    };
    //显示入口
    ImageView.prototype.show = function (json) {
        var s = this;
        var defaultOption = {
            pattern: 'default',
            selector: '',
            imageMargin: 10,
            clippingWidth: ImageView.width,
            clippingHeight: ImageView.height,
            clippingRadius: 0,
            clippingBackground: '',
            clippingImportSuffix: 'png',
            isGestureRotate: true
        };
        for (var name in json) {
            if (defaultOption.hasOwnProperty(name) && name in defaultOption) {
                defaultOption[name] = json[name];
            }
        }
        for (var name in defaultOption) {
            if (s.hasOwnProperty(name) && name in s) {
                s[name] = defaultOption[name];
            }
        }
        s.vImageList = SelectorDispose(s.selector);
        //是否显示
        var isDisplay = false;
        if (event) {
            var target = event.target;
            var currentTarget = event.currentTarget;
            if (s.vImageList.length === 1) {
                var vimgTarget = s.vImageList[0].target;
                if (vimgTarget === currentTarget || vimgTarget === target) {
                    isDisplay = true;
                }
            } else if (s.vImageList.length > 1) {
                if (isType(s.selector, 'string')) {
                    s.vImageList.every(function (item, i) {
                        if (item.target === target) {
                            s.page = i + 1;
                            isDisplay = true;
                            return false;
                        }
                        return true;
                    });
                } else {
                    isDisplay = true;
                }
            }
        } else {
            isDisplay = true;
        }
        if (isDisplay) {
            document.body.appendChild(_Element.container);
            if (s.pattern === 'clipping') {
                clippingMaskAdaptContainerSize();
            } else {
                _DisplayRectBox.x = 0;
                _DisplayRectBox.y = 0;
                _DisplayRectBox.width = ImageView.width;
                _DisplayRectBox.height = ImageView.height;
                _Element.iv_masks.addClass('iv_hide');
            }
            _Element.container.removeClass('iv_fade_out iv_hide').setAttribute('data-pattern', s.pattern);
            //填充图片
            if (s.vImageList.length) {
                var pageIndex = s.page - 1;
                s.vImageList[pageIndex].selected = true;
                _ViewBoxPositionX = -s.width * pageIndex - s.imageMargin * pageIndex;
                loadImages(s.vImageList);
                updatePageData();
                setTimeout(function () {
                    _Element.container.addClass('iv_fade_in');
                });
            } else {
                _Element.container.removeClass('iv_fade_in').addClass('iv_fade_out iv_hide');
            }
        } else {
            //还原初始状态
            s.restoreState();
        }
    };
    //关闭
    ImageView.prototype.close = function () {
        var s = this;
        if (!_AnimatePlaySign) {
            _AnimatePlaySign = true;
            s.restoreState();
            _Element.container.removeClass('iv_fade_in').addClass('iv_fade_out');
            setTimeout(function () {
                _Element.container.removeClass('iv_fade_out').remove();
                _AnimatePlaySign = false;
            }, 300);
        }
    };
    //上一页
    ImageView.prototype.prevPage = function () {
        var s = this;
        var page = s.page;
        if (s.page > 1) {
            page--;
        }
        s.indexPage(page);
    };
    //下一页
    ImageView.prototype.nextPage = function () {
        var s = this;
        var page = s.page;
        if (s.page < s.vImageList.length) {
            page++;
        }
        s.indexPage(page);
    };
    //跳转到指定页数
    ImageView.prototype.indexPage = function (index) {
        var s = this;
        var page = s.page;
        if (index >= 1 && index <= s.vImageList.length) {
            s.page = index;
        }
        var end = -s.width * (s.page - 1) - (s.imageMargin * (s.page - 1));
        if (_ViewBoxPositionX - end) {
            _PageFx.init({ x: _ViewBoxPositionX }, { x: end });
            _PageFx.duration = 300;
            _PageFx.onUpdate = function (data) {
                _ViewBoxPositionX = data.x;
                setViewBoxPositionX();
            };
            _PageFx.start();
        }
        if (page !== s.page) {
            SignPageing = true;
        }
        if (page === s.page) {
            s.vImageList[page - 1].adjustPosition();
        } else {
            s.vImageList[page - 1].adjustPosition(true);
        }
        //更新翻页数据
        updatePageData();
    };
    //还原初始状态
    ImageView.prototype.restoreState = function () {
        var s = this;
        s.page = 1;
        s.vImageList = [];
        _ViewBoxPositionX = 0;
        _Element.iv_viewBox.innerHTML = '';
        checkboxsEvent();
    };
    //实例化
    ImageView = window.ImageView = new ImageView();
    //生成元素
    (function () {
        //插入样式
        document.head.innerHTML = "<style>html{font-size:100px;font-size:calc(100vw/3.2)}body{font-size:.14rem}.iv_hide{display:none!important}.iv_lArrow{position:relative;display:inline-block;width:.16rem;height:.16rem;vertical-align:sub}.iv_lArrow:after{position:absolute;top:50%;left:70%;box-sizing:border-box;width:70%;height:70%;border-color:#989898;border-style:solid;border-width:2px;content:'';-webkit-transform:translate3d(-50%,-50%,0) rotateZ(-45deg);transform:translate3d(-50%,-50%,0) rotateZ(-45deg);border-right-color:transparent!important;border-bottom-color:transparent!important}.iv_checkboxs{position:relative;display:inline-block;width:.16rem;height:.16rem;border:solid 1px #bbb;border-radius:.02rem;vertical-align:top}.iv_checkboxs::after{position:absolute;top:40%;left:50%;display:none;box-sizing:border-box;width:70%;height:40%;border-color:#fff;border-style:solid;border-width:2px;content:'';-webkit-transform:translate3d(-50%,-50%,0) rotateZ(-45deg);transform:translate3d(-50%,-50%,0) rotateZ(-45deg);border-top-color:transparent!important;border-right-color:transparent!important}.iv_checkboxs[data-checked=true]{border-color:#1CCDA6;background:#1CCDA6}.iv_checkboxs[data-checked=true]:after{display:block}.imageViewer{position:fixed;top:0;right:0;bottom:0;left:0;z-index:1000;background:#2b2b2b;color:#3f3f3f;font-size:.14rem;opacity:0;-webkit-user-select:none;user-select:none}.imageViewer.iv_fade_in{opacity:1;-webkit-transition:opacity .3s ease-out;transition:opacity .3s ease-out}.imageViewer.iv_fade_in .iv_head{-webkit-transition:-webkit-transform .3s ease-out;transition:transform .3s ease-out;-webkit-transform:translateY(0);transform:translateY(0)}.imageViewer.iv_fade_in .iv_bottom{-webkit-transition:-webkit-transform .3s ease-out;transition:transform .3s ease-out;-webkit-transform:translateY(0);transform:translateY(0)}.imageViewer.iv_fade_out{opacity:0;-webkit-transition:opacity .3s ease-out;transition:opacity .3s ease-out}.imageViewer.iv_fade_out .iv_head,.imageViewer.iv_full .iv_head{-webkit-transition:-webkit-transform .3s ease-out;transition:transform .3s ease-out;-webkit-transform:translateY(-100%);transform:translateY(-100%)}.imageViewer.iv_fade_out .iv_bottom,.imageViewer.iv_full .iv_bottom{-webkit-transition:-webkit-transform .3s ease-out;transition:transform .3s ease-out;-webkit-transform:translateY(100%);transform:translateY(100%)}.imageViewer.iv_fade_out .iv_view{pointer-events:none}.imageViewer[data-pattern=default] .iv_bottom,.imageViewer[data-pattern=default] .iv_head{display:none}.imageViewer[data-pattern=edit] .iv_head .iv_confbtn{display:none}.imageViewer[data-pattern=clipping] .iv_bottom,.imageViewer[data-pattern=clipping] .iv_head .iv_delbtn,.imageViewer[data-pattern=clipping] .iv_head .iv_title{display:none}.imageViewer .iv_head{position:absolute;top:0;right:0;left:0;z-index:5;height:.4rem;background:#fff;-webkit-transform:translateY(-100%);transform:translateY(-100%)}.imageViewer .iv_head:after{position:absolute;right:0;bottom:0;left:0;height:1px;background:#b2b2b2;content:'';-webkit-transform:scaleY(.5);transform:scaleY(.5);-webkit-transform-origin:0 100%;transform-origin:0 100%}.imageViewer .iv_head .iv_closebtn{position:relative;z-index:2;float:left;padding:.09rem}.imageViewer .iv_head .iv_closebtn:after{position:absolute;top:50%;right:0;width:0;height:50%;border-right:solid 1px #ddd;content:'';-webkit-transform:translateY(-50%);transform:translateY(-50%)}.imageViewer .iv_head .iv_lArrow{width:.22rem;height:.22rem}.imageViewer .iv_head .iv_lArrow:after{border-color:#666}.imageViewer .iv_head .iv_title{position:absolute;top:50%;padding-left:.5rem;-webkit-transform:translateY(-50%);transform:translateY(-50%)}.imageViewer .iv_head .iv_confbtn,.imageViewer .iv_head .iv_delbtn{float:right;margin:.06rem;padding:.06rem .1rem;border-radius:.02rem;background:#f74c48;color:#fff;font-size:.12rem;line-height:.16rem}.imageViewer .iv_head .iv_delbtn:active{background:#e43430}.imageViewer .iv_head .iv_confbtn{padding:.06rem .15rem;background:#48ce55}.imageViewer .iv_head .iv_confbtn:active{background:#2fbf3d}.imageViewer .iv_head .iv_confbtn[disabled],.imageViewer .iv_head .iv_delbtn[disabled]{background:#ccc}.imageViewer .iv_head .iv_confbtn[disabled]:active,.imageViewer .iv_head .iv_delbtn[disabled]:active{background:#ccc}.imageViewer .iv_view{position:absolute;top:0;right:0;bottom:0;left:0;z-index:4;overflow:hidden;color:#fff}.imageViewer .iv_masks{position:absolute;top:50%;left:50%;z-index:2;box-sizing:border-box;border:solid 1px #fff;box-shadow:0 0 0 3rem rgba(0,0,0,.6);-webkit-transform:translate3d(-50%,-50%,0);transform:translate3d(-50%,-50%,0)}.imageViewer .iv_viewBox{position:absolute;width:100%;height:100%}.imageViewer .iv_view img{position:absolute;top:0;left:0;-webkit-transform-origin:0 0;transform-origin:0 0}.imageViewer .iv_bottom{position:absolute;right:0;bottom:0;left:0;z-index:5;height:.4rem;background:#fff;-webkit-transform:translateY(100%);transform:translateY(100%)}.imageViewer .iv_bottom:before{position:absolute;top:0;right:0;left:0;height:1px;background:#b2b2b2;content:'';-webkit-transform:scaleY(.5);transform:scaleY(.5);-webkit-transform-origin:0 0;transform-origin:0 0}.imageViewer .iv_check{padding:.11rem .1rem;line-height:.18rem}.imageViewer .iv_check .iv_checkboxs{margin-right:.05rem}.imageViewer .iv_check .iv_checkboxs{border-color:#bbb}.imageViewer .iv_check .iv_checkboxs[data-checked=true]{border-color:#48ce55;background:#48ce55}.imageViewer .iv_checkalone{float:right}.imageViewer .iv_checkall{float:left}</style>" +
            document.head.innerHTML;
        //插入元素
        _Element.container = document.createElement('div');
        _Element.container.addClass('imageViewer iv_hide');
        _Element.container.innerHTML = '<div class="iv_head"><div class="iv_closebtn"><div class="iv_lArrow"><i></i></div></div><div class="iv_title">0/0</div><div class="iv_delbtn">删除</div><div class="iv_confbtn">完成</div></div><div class="iv_view"><div class="iv_masks"></div><div class="iv_viewBox"></div></div><div class="iv_bottom"><div class="iv_check iv_checkall"><div class="iv_checkboxs"></div><span class="text">全选</span></div><div class="iv_check iv_checkalone"><div class="iv_checkboxs"></div><span class="text">选择</span></div></div>';
        _Element.iv_masks = _Element.container.querySelector('.iv_masks');
        _Element.iv_view = _Element.container.querySelector('.iv_view');
        _Element.iv_viewBox = _Element.container.querySelector('.iv_viewBox');
        _Element.iv_head = _Element.container.querySelector('.iv_head');
        _Element.iv_closebtn = _Element.iv_head.querySelector('.iv_closebtn');
        _Element.iv_title = _Element.iv_head.querySelector('.iv_title');
        _Element.iv_delbtn = _Element.iv_head.querySelector('.iv_delbtn');
        _Element.iv_confbtn = _Element.iv_head.querySelector('.iv_confbtn');
        _Element.iv_bottom = _Element.container.querySelector('.iv_bottom');
        _Element.iv_checkalone = _Element.iv_bottom.querySelector('.iv_checkalone');
        _Element.iv_checkall = _Element.iv_bottom.querySelector('.iv_checkall');
        _Element.iv_checkboxs = _Element.iv_checkalone.querySelector('.iv_checkboxs');
        _Element.iv_checkboxsAll = _Element.iv_checkall.querySelector('.iv_checkboxs');
        bindingEvent();
    })();
    //绑定事件
    function bindingEvent() {
        var s = ImageView;
        //多选按钮事件
        _Element.iv_checkalone.addEventListener('click', function () {
            checkboxsEvent();
            if (_Element.iv_checkboxs.getAttribute('data-checked') === 'true') {
                s.vImageList[s.page - 1].selected = true;
            } else {
                s.vImageList[s.page - 1].selected = false;
            }
            updatePageData();
        });
        //全选按钮事件
        _Element.iv_checkall.addEventListener('click', function () {
            checkboxsEvent();
            if (_Element.iv_checkboxsAll.getAttribute('data-checked') === 'true') {
                s.vImageList.forEach(function (item) {
                    item.selected = true;
                });
            } else {
                s.vImageList.forEach(function (item) {
                    item.selected = false;
                });
            }
            updatePageData();
        });
        //删除按钮事件
        _Element.iv_delbtn.addEventListener('click', function () {
            var s = ImageView;
            if (_Element.iv_delbtn.getAttribute('disabled') === null) {
                var list = getSelectedImage();
                list.forEach(function (item, i) {
                    list[i] = {
                        index: item.index,
                        target: item.target || item.src
                    };
                });
                if (list.length) {
                    s.dispatchEvent('delete', list);
                }
                s.close();
            }
        });
        //关闭按钮事件
        _Element.iv_closebtn.addEventListener('click', function () {
            ImageView.close();
        });
        //裁剪完成按钮事件
        _Element.iv_confbtn.addEventListener('click', function () {
            var image = importClippingtoImage();
            s.dispatchEvent('clipping', image);
            ImageView.close();
        });
        //绑定touch事件
        _Element.iv_view.addEventListener('touchstart', touchstart, { passive: false });
        _Element.iv_view.addEventListener('touchmove', touchmove, { passive: false });
        _Element.iv_view.addEventListener('touchend', touchend, { passive: false });
    };
    //更新翻页数据
    function updatePageData() {
        var s = ImageView;
        var list = getSelectedImage();
        if (list.length) {
            _Element.iv_delbtn.removeAttribute('disabled');
        } else {
            _Element.iv_delbtn.setAttribute('disabled', '');
        }
        //是否全部选中
        if (list.length === s.vImageList.length) {
            _Element.iv_checkboxsAll.setAttribute('data-checked', true);
        } else {
            _Element.iv_checkboxsAll.setAttribute('data-checked', false);
        }
        //当前页是否选中
        if (s.vImageList[s.page - 1].selected === true) {
            _Element.iv_checkboxs.setAttribute('data-checked', true);
        } else {
            _Element.iv_checkboxs.setAttribute('data-checked', false);
        }
        setViewBoxPositionX();
        if (s.pattern !== 'clipping') {
            _Element.iv_title.innerText = s.page + '/' + s.vImageList.length;
        }
        _Element.iv_delbtn.innerText = '删除' + list.length + '/' + s.vImageList.length;
    };
    //筛选出被选中的图片
    function getSelectedImage() {
        var selectedList = [];
        ImageView.vImageList.forEach(function (item) {
            if (item.selected) {
                selectedList.push(item);
            }
        });
        return selectedList;
    };
    //设置显示盒子位置
    function setViewBoxPositionX() {
        _Element.iv_viewBox.style.webkitTransform = _Element.iv_viewBox.style.transform = 'translateX(' + _ViewBoxPositionX + 'px)';
    };
    //输出裁剪后图片
    function importClippingtoImage() {
        var s = ImageView;
        var vimg = s.vImageList[0];
        //当前图片显示宽度
        var imageWidth = vimg.width * vimg.scale;
        //根据图片实际大小计算放大倍数
        var magnify = Math.max(vimg.naturalWidth / imageWidth, 1);
        //绘制层
        var drawCanvas = document.createElement('canvas');
        var drawContext = drawCanvas.getContext('2d');
        drawCanvas.width = s.width * magnify;
        drawCanvas.height = s.height * magnify;
        //输出层
        var outputCanvas = document.createElement('canvas');
        var outputContext = outputCanvas.getContext('2d');
        outputCanvas.width = s.clippingWidth;
        outputCanvas.height = s.clippingHeight;
        //圆角大小
        var radius = _DisplayRectBox.width / s.clippingWidth * s.clippingRadius;
        radius = Math.min(Math.min(_DisplayRectBox.width, _DisplayRectBox.height) / 2, radius) * magnify;
        //绘制图片
        if (s.clippingBackground) {
            drawContext.fillStyle = s.clippingBackground;
            drawContext.fillRect(0, 0, drawCanvas.width, drawCanvas.height);
        }
        drawContext.save();
        drawContext.setTransform(1, 0, 0, 1,
            _DisplayRectBox.x * magnify,
            _DisplayRectBox.y * magnify);
        drawContext.radiusRect(
            _DisplayRectBox.width * magnify,
            _DisplayRectBox.height * magnify, 
            radius, radius, radius, radius);
        drawContext.clip();
        drawContext.setTransform(1, 0, 0, 1,
            vimg.position.x * magnify,
            vimg.position.y * magnify);
        drawContext.drawImage(vimg.image, 0, 0, vimg.naturalWidth, vimg.naturalHeight);
        drawContext.restore();
        //绘制到输入层
        var zoom = outputCanvas.width / _DisplayRectBox.width;
        outputContext.drawImage(drawCanvas,
            (outputCanvas.width - s.width * zoom) / 2,
            (outputCanvas.height - s.height * zoom) / 2,
            s.width * zoom,
            s.height * zoom);
        return outputCanvas.toDataURL('image/' + s.clippingImportSuffix);
    };
    //加载图片
    function loadImages(list) {
        var index = 0;
        list.forEach(function (item, i) {
            var w, h, left, top, width, height;
            var image = document.createElement('img');
            image.src = item.src;
            image.onload = function () {
                item.naturalWidth = image.naturalWidth;
                item.naturalHeight = image.naturalHeight;
                item.adaptContainerSize();
                item.centered();
                item.useDataToImage();
            };
            item.image = image;
            item.index = index++;
            item.imageMargin = ImageView.imageMargin;
            _Element.iv_viewBox.appendChild(image);
        });
    };
    //选择器处理
    function SelectorDispose(selector) {
        var s = this;
        var list = [];
        var target = event && event.target;
        var currentTarget = event && event.currentTarget;
        if (isType(selector, 'array')) {
            //数组列表
            selector.forEach(function (item) {
                if (typeof item === 'string') {
                    list.push(new Vimg({ src: item }));
                } else if (typeof item === 'object') {
                    if (item.src) {
                        list.push(new Vimg({ src: item.src, target: item }));
                    }
                }
            });
        } else if (isType(selector, 'string')) {
            if (currentTarget) {
                currentTarget = currentTarget.querySelectorAll(selector);
            } else {
                currentTarget = document.querySelectorAll(selector);
            }
            var item;
            for (var i = 0; i < currentTarget.length; i++) {
                item = currentTarget[i];
                if (item.nodeName.toLowerCase() === 'img') {
                    //img标签
                    list.push(new Vimg({ src: item.src, target: item }));
                } else {
                    //背景
                    var backImage = window.getComputedStyle(item).backgroundImage;
                    if (/^url/.test(backImage)) {
                        list.push(new Vimg({
                            src: backImage.replace(/^url\(["']|url\(/ig, '').replace(/["\']\)|\)$/g, ''),
                            target: item
                        }));
                    }
                }
            }
        }
        if (ImageView.pattern === 'clipping' && list.length > 0) {
            if (target) {
                for (var i = 0; i < list.length; i++) {
                    if (list[i].target === target) {
                        return [list[i]];
                    }
                }
            } else {
                return [list[0]];
            }
        }
        return list;
    };
    //裁剪遮罩适应容器大小
    function clippingMaskAdaptContainerSize() {
        var s = ImageView;
        var zoom = 1;
        var ratio = s.clippingWidth / s.clippingHeight;
        var width = s.width;
        var height = width / ratio;
        if (height > s.height) {
            height = s.height;
            width = height * ratio;
        }
        zoom = width / s.clippingWidth;
        _DisplayRectBox.x = Math.round((s.width - width) / 2);
        _DisplayRectBox.y = Math.round((s.height - height) / 2);
        _DisplayRectBox.width = Math.round(width);
        _DisplayRectBox.height = Math.round(height);
        //应用样式
        _Element.iv_masks.style.width = width + 'px';
        _Element.iv_masks.style.height = height + 'px';
        _Element.iv_masks.style.borderRadius = s.clippingRadius * zoom + 'px';
        _Element.iv_masks.removeClass('iv_hide');
    };
    //数据类型判断
    function isType(obj, name) {
        return Object.prototype.toString.call(obj).toLowerCase() == '[object ' + name.toLowerCase() + ']';
    };
    //多选按钮事件
    function checkboxsEvent() {
        var target = event.currentTarget;
        if (target.hasClass('iv_checkboxs')) {
            var iv_checkboxs = target;
        } else {
            var iv_checkboxs = target.querySelector('.iv_checkboxs');
            if (!iv_checkboxs) {
                return;
            }
        }
        var checked = iv_checkboxs.getAttribute('data-checked');
        if (checked === 'true') {
            iv_checkboxs.setAttribute('data-checked', false);
        } else {
            iv_checkboxs.setAttribute('data-checked', true);
        }
    };
    //按下的触点列表
    var DownTouchList = [];
    //记录按下时显示盒子的状态
    var ViewBoxDataX;
    //标记是否正在翻页
    var SignPageing = false;
    //记录手指触摸轨迹
    var TouchPath = [];
    //记录当前操作
    var CurrentHandle = '';
    //记录上一次手指移动的方向
    var LastMoveDirection = '';
    //手指按下
    function touchstart(e) {
        var touch = {
            clientX: e.changedTouches[0].clientX,
            clientY: e.changedTouches[0].clientY,
            identifier: e.changedTouches[0].identifier,
            timestamp: Date.now()
        };
        //如果当前触点的identifier已经存在按下的触点列表中，则不添加到列表
        var index = DownTouchList.indexOf2(touch.identifier, 'identifier');
        if (index > -1) {
            DownTouchList[index].clientX = touch.clientX;
            DownTouchList[index].clientY = touch.clientY;
            DownTouchList[index].timestamp = touch.timestamp;
        } else {
            DownTouchList.push(touch);
        }
        //停止所有动画
        _PageFx.stopTimer();
        if (!SignPageing) {
            _RestoreFx.stopTimer();
            _ScrollFx_X.stopTimer();
            _ScrollFx_Y.stopTimer();
            _RestoreFx_X.stopTimer();
            _RestoreFx_Y.stopTimer();
        }
        //还原图片显示深度
        ImageView.vImageList.forEach(function (item) {
            item.image.style.zIndex = '1';
        });
        //判断当前操作
        if (CurrentHandle === '') {
            if (DownTouchList.length === 1) {
                slidestart();
            } else {
                gesturestart();
            }
        }
        e.preventDefault();
    };
    //手指移动中
    function touchmove(e) {
        if (DownTouchList.length) {
            var touch = [];
            for (var i = 0; i < e.touches.length; i++) {
                touch.push({
                    clientX: e.touches[i].clientX,
                    clientY: e.touches[i].clientY,
                    identifier: e.touches[i].identifier,
                    timestamp: Date.now()
                });
            }
            //从触点列表删除已经离开屏幕的触点
            DownTouchList.forEach(function (item, i) {
                var index = touch.indexOf2(item.identifier, 'identifier');
                if (index > -1) {
                    //触点相对于按下时的水平方向
                    if (touch[index].clientX < item.clientX) {
                        item.horDirection = 'left';
                    } else {
                        item.horDirection = 'right';
                    }
                    if (touch[index].clientY < item.clientY) {
                        item.verDirection = 'top';
                    } else {
                        item.verDirection = 'bottom';
                    }
                    item.isMove = true;
                } else {
                    DownTouchList.splice(i, 1);
                    ViewBoxDataX = _ViewBoxPositionX;
                }
            });
            //如果触点列表里的触点数量小于当前屏幕上的触点数量，加入到触点列表
            if (DownTouchList.length < touch.length) {
                touch.forEach(function (item) {
                    var index = DownTouchList.indexOf2(item.identifier, 'identifier');
                    if (index === -1) {
                        DownTouchList.push(item);
                        gesturestart();
                    }
                });
            }
            var handle = '';
            if (CurrentHandle === 'slide' || CurrentHandle === 'slidescale') {
                handle = 'slide';
            } else if (CurrentHandle === 'gesture') {
                handle = 'gesture';
            } else {
                if (DownTouchList.length === 1) {
                    CurrentHandle = handle = 'slide';
                } else {
                    CurrentHandle = handle = 'gesture';
                }
            }
            if (handle === 'slide') {
                slideing(touch[0]);
            } else if (handle === 'gesture' && DownTouchList.length > 1) {
                var touch1, touch2;
                var identifier1 = DownTouchList[0].identifier;
                var identifier2 = DownTouchList[1].identifier;
                //从当前列表中筛选出第一、二个触点
                DownTouchList.forEach(function (item, i) {
                    item = touch[i];
                    if (item.identifier === identifier1) {
                        touch1 = item;
                    } else if (item.identifier === identifier2) {
                        touch2 = item;
                    }
                });
                gesturechange(touch1, touch2);
            }
            e.preventDefault();
        }
    };
    //手指抬起
    function touchend(e) {
        if (DownTouchList.length) {
            var touch = {
                clientX: e.changedTouches[0].clientX,
                clientY: e.changedTouches[0].clientY,
                identifier: e.changedTouches[0].identifier,
                timestamp: Date.now()
            };
            //删除跟当前触点identifier相同的按下触点列表中的触点
            var currentTouch;
            var index = DownTouchList.indexOf2(touch.identifier, 'identifier');
            if (index > -1) {
                currentTouch = DownTouchList.splice(index, 1)[0];
            }
            if (DownTouchList.length === 0) {
                slideend(currentTouch);
                CurrentHandle = '';
            } else {
                gestureend(currentTouch);
            }
            if (currentTouch.clientX === touch.clientX &&
                currentTouch.clientY === touch.clientY) {
                //单击隐藏上下工具栏
                if (_Element.container.hasClass('iv_full')) {
                    _Element.container.removeClass('iv_full');
                } else {
                    _Element.container.addClass('iv_full');
                }
                if (ImageView.pattern === 'default') {
                    ImageView.close();
                }
            }
        }
    };
    /*
        滑动功能
    */
    //滑动开始
    function slidestart() {
        //当前页的图片对象
        var vimg = ImageView.vImageList[ImageView.page - 1];
        vimg.firstPosition.x = vimg.position.x;
        vimg.firstPosition.y = vimg.position.y;
        ViewBoxDataX = _ViewBoxPositionX;
    };
    //滑动中
    function slideing(touch) {
        var s = ImageView;
        var moveX = touch.clientX - DownTouchList[0].clientX;
        var moveY = touch.clientY - DownTouchList[0].clientY;
        //阻尼系数
        var damping = .3;
        //当前页的图片对象
        var vimg = s.vImageList[s.page - 1];
        //当前宽高
        var imageWidth = vimg.width * vimg.scale;
        var imageHeight = vimg.height * vimg.scale;
        //当前移动方向
        var direc = DownTouchList[0].horDirection;
        //当前页数显示盒子的初始位置
        var vInitX = -(s.width + s.imageMargin) * (s.page - 1);
        //判断滑动模式
        if (_DisplayRectBox.width < imageWidth || _DisplayRectBox.height < imageHeight) {
            CurrentHandle = 'slidescale';
        }
        //当前位置
        var posX = vimg.firstPosition.x + moveX;
        var posY = vimg.firstPosition.y + moveY;
        //翻页位置
        var pageX = vInitX;
        //边界外最大左超出量
        var maxBeyond = imageWidth - _DisplayRectBox.width;
        //当前模式
        if (s.pattern === 'clipping') {
            //应用x轴
            var maxX = _DisplayRectBox.x - maxBeyond;
            if (posX > _DisplayRectBox.x) {
                if (vimg.firstPosition.x > _DisplayRectBox.x) {
                    var beyond = (vimg.firstPosition.x - _DisplayRectBox.x) / damping + moveX;
                    posX = _DisplayRectBox.x + beyond * damping;
                } else {
                    posX = _DisplayRectBox.x + (posX - _DisplayRectBox.x) * damping;
                }
            } else if (posX < maxX) {
                if (vimg.firstPosition.x < maxX) {
                    var beyond = (vimg.firstPosition.x - maxX) / damping + moveX;
                    posX = maxX + beyond * damping;
                } else {
                    posX = maxX + (posX - maxX) * damping;
                }
            }
        } else if (imageWidth > _DisplayRectBox.width) {
            //边界外左右超出量
            var leftBeyond = -posX;
            var rightBeyond = maxBeyond - leftBeyond;
            //判断方向
            if (direc === 'left') {
                if (rightBeyond > 0) {
                    pageX = vInitX;
                } else {
                    if (pageX <= vInitX) {
                        posX = -maxBeyond;
                        pageX = vInitX + rightBeyond;
                        if (ViewBoxDataX < vInitX) {
                            var beyond = ViewBoxDataX - vInitX + moveX;
                            pageX = vInitX + beyond;
                        } else {
                            //如果开始滑动时不处于边界
                            if (s.page == s.vImageList.length ||
                                Math.abs(vimg.firstPosition.x) !== imageWidth - s.width) {
                                //如果超出边界，应用阻尼效果
                                if (ViewBoxDataX < vInitX) {
                                    var beyond = (ViewBoxDataX - vInitX) / damping + moveX;
                                    pageX = vInitX + beyond * damping;
                                } else if (pageX < vInitX) {
                                    pageX = vInitX + rightBeyond * damping;
                                }
                            } else {
                                CurrentHandle = 'slide';
                            }
                        }
                    }
                }
            } else if (direc === 'right') {
                if (leftBeyond > 0) {
                    pageX = vInitX;
                } else {
                    if (pageX >= vInitX) {
                        posX = 0;
                        pageX = vInitX - leftBeyond;
                        if (ViewBoxDataX > vInitX) {
                            pageX = ViewBoxDataX + moveX;
                        } else {
                            //如果开始滑动时不处于边界
                            if (vimg.firstPosition.x !== 0 || s.page == 1) {
                                //如果超出边界，应用阻尼效果
                                if (ViewBoxDataX > vInitX) {
                                    pageX = (ViewBoxDataX / damping + moveX) * damping;
                                } else if (pageX > vInitX) {
                                    pageX = vInitX + (pageX - vInitX) * damping;
                                }
                            } else {
                                CurrentHandle = 'slide';
                            }
                        }
                    }
                }
            }
        } else {
            //翻页
            var lastX = -(s.width + s.imageMargin) * (s.vImageList.length - 1);
            //应用
            pageX = ViewBoxDataX + moveX;
            //如果超出边界，应用阻尼效果
            if (pageX > 0) {
                if (ViewBoxDataX > vInitX) {
                    pageX = (ViewBoxDataX / damping + moveX) * damping;
                } else {
                    pageX = pageX * damping;
                }
            } else if (pageX < lastX) {
                if (ViewBoxDataX < vInitX) {
                    var beyond = (ViewBoxDataX - vInitX) / damping + moveX;
                    pageX = vInitX + beyond * damping;
                } else {
                    var beyond = pageX - vInitX;
                    pageX = vInitX + beyond * damping;
                }
            }
            posX = vimg.firstPosition.x;
            posY = vimg.firstPosition.y;
        }
        if (s.pattern === 'clipping' || imageHeight > _DisplayRectBox.height) {
            //应用y轴
            var maxY = -(imageHeight - _DisplayRectBox.height - _DisplayRectBox.y);
            if (posY > _DisplayRectBox.y) {
                if (vimg.firstPosition.y > _DisplayRectBox.y) {
                    var beyond = (vimg.firstPosition.y - _DisplayRectBox.y) / damping + moveY;
                    posY = _DisplayRectBox.y + beyond * damping;
                } else {
                    posY = _DisplayRectBox.y + (posY - _DisplayRectBox.y) * damping;
                }
            } else if (posY < maxY) {
                if (vimg.firstPosition.y < maxY) {
                    var beyond = (vimg.firstPosition.y - maxY) / damping + moveY;
                    posY = maxY + beyond * damping;
                } else {
                    posY = maxY + (posY - maxY) * damping;
                }
            }
        }
        TouchPath.push(touch);
        vimg.position.x = posX;
        vimg.position.y = posY;
        _ViewBoxPositionX = pageX;
        //应用数据
        vimg.useDataToImage();
        setViewBoxPositionX();
    };
    //滑动结束
    function slideend(touch) {
        var s = ImageView;
        touch.horDirection = touch.horDirection || LastMoveDirection;
        if (touch.isMove || _ViewBoxPositionX % s.width) {
            //获取手指滑动的速度
            var speed = GetTouchMoveSpeed(10);
            if (CurrentHandle === 'slidescale') {
                s.vImageList[s.page - 1].scrollScreen(GetTouchMoveSpeed(100), touch);
            } else {
                //翻页
                if (speed.x >= .3 && touch.horDirection === 'right') {
                    s.prevPage();
                } else if (speed.x <= -.3 && touch.horDirection === 'left') {
                    s.nextPage();
                } else {
                    BasedSlideXSetPage(touch.horDirection);
                }
            }
        } else {
            s.indexPage(s.page);
        }
        TouchPath = [];
        CurrentHandle = '';
        LastMoveDirection = touch.horDirection;
    };
    //根据当前滑动位置判断当前页数
    function BasedSlideXSetPage(horDirection) {
        var viewWidth = ImageView.width;
        var viewLeft = Math.min(_ViewBoxPositionX + ImageView.imageMargin, 0);
        var index = Math.abs(parseInt(viewLeft / viewWidth));
        if (horDirection === 'right') {
            var moveX = viewWidth - Math.abs(viewLeft % viewWidth);
            if (Math.abs(moveX / viewWidth) >= .2) {
                ImageView.indexPage(index + 1);
            } else {
                ImageView.indexPage(ImageView.page);
            }
        } else if (horDirection === 'left') {
            var moveX = viewLeft % viewWidth;
            if (Math.abs(moveX / viewWidth) >= .2) {
                ImageView.indexPage(index + 2);
            } else {
                ImageView.indexPage(ImageView.page);
            }
        }
    };
    //获取指定毫秒数内手指移动的速度
    function GetTouchMoveSpeed(time) {
        var isfind;
        var SpeedList = { x: 0, y: 0 };
        var length = TouchPath.length;
        if (length > 1) {
            if (Date.now() - TouchPath[length - 1].timestamp < 100) {
                isfind = false;
                var newTouch = TouchPath[length - 1];
                var timestamp = newTouch.timestamp - time;
                for (var i = length - 1; i >= 0; i--) {
                    var item = TouchPath[i];
                    if (item.timestamp === timestamp) {
                        isfind = true;
                        SpeedList.x = newTouch.clientX - item.clientX;
                        SpeedList.y = newTouch.clientY - item.clientY;
                        break;
                    } else if (item.timestamp < timestamp) {
                        isfind = true;
                        minTouch = item;
                        maxTouch = TouchPath[i + 1];
                        ratio = (timestamp - minTouch.timestamp) / (maxTouch.timestamp - minTouch.timestamp);
                        SpeedList.x = newTouch.clientX - ((maxTouch.clientX - minTouch.clientX) * ratio + minTouch.clientX);
                        SpeedList.y = newTouch.clientY - ((maxTouch.clientY - minTouch.clientY) * ratio + minTouch.clientY);
                        break;
                    }
                }
                if (!isfind) {
                    ratio = (newTouch.timestamp - TouchPath[0].timestamp) / time;
                    SpeedList.x = (newTouch.clientX - TouchPath[0].clientX) / ratio;
                    SpeedList.y = (newTouch.clientY - TouchPath[0].clientY) / ratio;
                }
            }
        }
        return SpeedList;
    };
    /*
        缩放功能
    */
    //当有两根或多根手指放到屏幕上的时候触发
    function gesturestart() {
        //当前页的图片对象
        var vimg = ImageView.vImageList[ImageView.page - 1];
        var ratioX = (DownTouchList[0].clientX - vimg.position.x) / (vimg.width * vimg.scale);
        var ratioY = (DownTouchList[0].clientY - vimg.position.y) / (vimg.height * vimg.scale);
        vimg.lastScale = vimg.scale;
        vimg.anchor.x = vimg.width * ratioX;
        vimg.anchor.y = vimg.height * ratioY;
        vimg.firstPosition.x = vimg.position.x - (1 - vimg.scale) * vimg.anchor.x;
        vimg.firstPosition.y = vimg.position.y - (1 - vimg.scale) * vimg.anchor.y;
    };
    //当有两根或多根手指在屏幕上，并且有手指移动的时候触发
    function gesturechange(touch1, touch2) {
        var scale = getDistance(touch1, touch2) / getDistance(DownTouchList[0], DownTouchList[1]);
        var rotate = 0;
        //当前页的图片对象
        var vimg = ImageView.vImageList[ImageView.page - 1];
        //修正位置
        var a = 1, b = 0, c = 0, d = 1, tx, ty;
        //旋转
        if (ImageView.isGestureRotate && ImageView.pattern !== 'clipping') {
            rotate = getAngle(touch1, touch2) - getAngle(DownTouchList[0], DownTouchList[1]);
            if (rotate > 180) {
                rotate = -(360 - rotate);
            }
            var pi = Math.PI / 180;
            var radian = pi * rotate;
            var cos = Math.cos(radian);
            var sin = Math.sin(radian);
            a = cos;
            b = sin;
            c = -sin;
            d = cos;
        }
        //缩放
        scale *= vimg.lastScale;
        a *= scale;
        b *= scale;
        c *= scale;
        d *= scale;
        //应用原点调整位置
        var tx = 0;
        var ty = 0;
        tx = touch1.clientX - (vimg.anchor.x * a + vimg.anchor.y * c);
        ty = touch1.clientY - (vimg.anchor.y * d + vimg.anchor.x * b);
        //计算两根手指的中心点
        var centerX = (touch1.clientX + touch2.clientX) / 2;
        var centerY = (touch1.clientY + touch2.clientY) / 2;
        var ratioX = (centerX - vimg.position.x) / (vimg.width * vimg.scale);
        var ratioY = (centerY - vimg.position.y) / (vimg.height * vimg.scale);
        vimg.lastAnchor.x = vimg.width * ratioX;
        vimg.lastAnchor.y = vimg.height * ratioY;
        //应用
        vimg.scale = scale;
        vimg.rotate = rotate;
        vimg.position.x = tx;
        vimg.position.y = ty;
        vimg.useDataToImage();
    };
    //当倒数第二根手指提起的时候触发，结束gesture
    function gestureend(touch) {
        CurrentHandle = '';
        DownTouchList = [];
        ViewBoxDataX = _ViewBoxPositionX;
        ImageView.indexPage(ImageView.page);
    };
    //获取获取两点之间的距离
    function getDistance(p1, p2) {
        var x = p2.clientX - p1.clientX,
            y = p2.clientY - p1.clientY;
        return Math.sqrt((x * x) + (y * y));
    };
    //获取两点之间的夹角
    function getAngle(p1, p2) {
        var x = p1.clientX - p2.clientX,
            y = p1.clientY - p2.clientY;
        return Math.atan2(y, x) * 180 / Math.PI;
    };
})();