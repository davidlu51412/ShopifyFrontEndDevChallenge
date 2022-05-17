
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const OPEN_AI_KEY =
      "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";

    async function getAIResponses(prompt) {
      const data = {
        prompt: prompt,
        temperature: 0.5,
        max_tokens: 64,
        top_p: 1.0,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
      };

      const res = await fetch(
        "https://api.openai.com/v1/engines/text-curie-001/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPEN_AI_KEY}`,
          },
          body: JSON.stringify(data),
        }
      );

      const AI = await res.json();

      return AI.choices[0].text;
    }

    function setCookie(name, value, days) {
      var expires = "";
      if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
      }
      document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }
    function getCookie(name) {
      var nameEQ = name + "=";
      var ca = document.cookie.split(";");
      for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == " ") c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
    }

    function eraseAllCookies() {
      var cookies = document.cookie.split(";");
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/App.svelte generated by Svelte v3.48.0 */

    const { document: document_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[13] = list[i];
    	return child_ctx;
    }

    // (78:2) {#if items.length != 0}
    function create_if_block_1(ctx) {
    	let div;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "X clear all";
    			attr_dev(button, "class", "svelte-1gfvy6b");
    			add_location(button, file, 79, 4, 2657);
    			attr_dev(div, "id", "clear-searches");
    			attr_dev(div, "class", "svelte-1gfvy6b");
    			add_location(div, file, 78, 3, 2627);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[9], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(78:2) {#if items.length != 0}",
    		ctx
    	});

    	return block;
    }

    // (86:2) {#each items as item}
    function create_each_block(ctx) {
    	let div2;
    	let p;
    	let t0_value = /*item*/ ctx[13].prompt.toUpperCase() + "";
    	let t0;
    	let t1;
    	let div0;
    	let t2_value = `"${/*item*/ ctx[13].result}"` + "";
    	let t2;
    	let t3;
    	let br;
    	let t4;
    	let div1;
    	let i;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			br = element("br");
    			t4 = space();
    			div1 = element("div");
    			i = element("i");
    			i.textContent = "— AI text-curie-001";
    			attr_dev(p, "class", "svelte-1gfvy6b");
    			add_location(p, file, 87, 5, 2805);
    			attr_dev(div0, "class", "item-result svelte-1gfvy6b");
    			add_location(div0, file, 88, 5, 2845);
    			add_location(br, file, 89, 5, 2902);
    			attr_dev(i, "class", "item-result svelte-1gfvy6b");
    			add_location(i, file, 90, 31, 2938);
    			attr_dev(div1, "class", "item-result svelte-1gfvy6b");
    			add_location(div1, file, 90, 5, 2912);
    			attr_dev(div2, "class", "item-container svelte-1gfvy6b");
    			add_location(div2, file, 86, 3, 2771);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p);
    			append_dev(p, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, t2);
    			append_dev(div2, t3);
    			append_dev(div2, br);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, i);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 4 && t0_value !== (t0_value = /*item*/ ctx[13].prompt.toUpperCase() + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*items*/ 4 && t2_value !== (t2_value = `"${/*item*/ ctx[13].result}"` + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(86:2) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    // (94:2) {#if items.length == 0}
    function create_if_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Type anything you want in the search box to see what the AI has to say!";
    			attr_dev(p, "class", "svelte-1gfvy6b");
    			add_location(p, file, 94, 4, 3046);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(94:2) {#if items.length == 0}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link;
    	let t0;
    	let main;
    	let div1;
    	let div0;
    	let input;
    	let t1;
    	let button0;
    	let i0;
    	let t2;
    	let button1;
    	let i1;
    	let t3;
    	let div2;
    	let button2;
    	let i2;
    	let t4;
    	let br;
    	let t5;
    	let t6;
    	let t7;
    	let mounted;
    	let dispose;
    	let if_block0 = /*items*/ ctx[2].length != 0 && create_if_block_1(ctx);
    	let each_value = /*items*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block1 = /*items*/ ctx[2].length == 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			link = element("link");
    			t0 = space();
    			main = element("main");
    			div1 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t1 = space();
    			button0 = element("button");
    			i0 = element("i");
    			t2 = space();
    			button1 = element("button");
    			i1 = element("i");
    			t3 = space();
    			div2 = element("div");
    			button2 = element("button");
    			i2 = element("i");
    			t4 = space();
    			br = element("br");
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t7 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(link, "rel", "stylesheet");
    			attr_dev(link, "href", "https://unpkg.com/mono-icons@1.0.5/iconfont/icons.css");
    			add_location(link, file, 1, 1, 15);
    			attr_dev(input, "id", "searchbox");
    			attr_dev(input, "placeholder", /*sampleSearch*/ ctx[1]);
    			input.autofocus = true;
    			attr_dev(input, "class", "svelte-1gfvy6b");
    			add_location(input, file, 63, 3, 2020);
    			attr_dev(i0, "class", "mi mi-search navigation svelte-1gfvy6b");
    			add_location(i0, file, 64, 38, 2143);
    			attr_dev(button0, "class", "svelte-1gfvy6b");
    			add_location(button0, file, 64, 3, 2108);
    			attr_dev(div0, "class", "search svelte-1gfvy6b");
    			add_location(div0, file, 62, 2, 1996);
    			attr_dev(i1, "class", "mi mi-chevron-down navigation svelte-1gfvy6b");
    			add_location(i1, file, 67, 3, 2323);
    			attr_dev(button1, "class", "svelte-1gfvy6b");
    			add_location(button1, file, 66, 2, 2203);
    			attr_dev(div1, "id", "search-parent");
    			attr_dev(div1, "class", "svelte-1gfvy6b");
    			add_location(div1, file, 61, 1, 1969);
    			attr_dev(i2, "class", "mi mi-chevron-up navigation svelte-1gfvy6b");
    			add_location(i2, file, 73, 3, 2534);
    			attr_dev(button2, "class", "svelte-1gfvy6b");
    			add_location(button2, file, 72, 2, 2412);
    			add_location(br, file, 75, 2, 2592);
    			attr_dev(div2, "id", "results");
    			attr_dev(div2, "class", "svelte-1gfvy6b");
    			add_location(div2, file, 71, 1, 2391);
    			attr_dev(main, "class", "svelte-1gfvy6b");
    			add_location(main, file, 60, 0, 1961);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document_1.head, link);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, div1);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			set_input_value(input, /*inputText*/ ctx[0]);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(button0, i0);
    			append_dev(div1, t2);
    			append_dev(div1, button1);
    			append_dev(button1, i1);
    			append_dev(main, t3);
    			append_dev(main, div2);
    			append_dev(div2, button2);
    			append_dev(button2, i2);
    			append_dev(div2, t4);
    			append_dev(div2, br);
    			append_dev(div2, t5);
    			if (if_block0) if_block0.m(div2, null);
    			append_dev(div2, t6);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div2, t7);
    			if (if_block1) if_block1.m(div2, null);
    			input.focus();

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[5]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*sampleSearch*/ 2) {
    				attr_dev(input, "placeholder", /*sampleSearch*/ ctx[1]);
    			}

    			if (dirty & /*inputText*/ 1 && input.value !== /*inputText*/ ctx[0]) {
    				set_input_value(input, /*inputText*/ ctx[0]);
    			}

    			if (/*items*/ ctx[2].length != 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div2, t6);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*items*/ 4) {
    				each_value = /*items*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, t7);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*items*/ ctx[2].length == 0) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(link);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let inputText = "";

    	let sampleSearches = [
    		"write a speech...",
    		"city life vs country life...",
    		"mans best friend...",
    		"proper eating habits...",
    		"thoughts on computer science...",
    		"what is life...",
    		"how to critque art...",
    		"how to use chopsticks...",
    		"best food in europe...",
    		"how to build a house..."
    	];

    	const randomPlaceholder = () => {
    		return sampleSearches[Math.floor(Math.random() * sampleSearches.length)];
    	};

    	let sampleSearch = randomPlaceholder();
    	let currCookie = getCookie("savedItems");
    	let items = currCookie == null ? [] : JSON.parse(currCookie);

    	const addItem = () => {
    		let query = inputText;
    		if (query.length == 0) query = sampleSearch.slice(0, -3);

    		// getAIResponses(inputText).then((res) => {
    		let res = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus felis metus, maximus ac tempus euismod, convallis et ligula. Suspendisse non pharetra sapien, sed gravida leo. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean dignissim mauris lacus, sed imperdiet arcu ullamcorper ac.";

    		$$invalidate(2, items = [
    			{
    				id: items.length,
    				prompt: query,
    				result: res
    			},
    			...items
    		]);

    		$$invalidate(0, inputText = "");
    		$$invalidate(1, sampleSearch = randomPlaceholder());
    		document.getElementById("searchbox").focus();
    		document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'center' });
    		setCookie("savedItems", JSON.stringify(items));
    	}; // })

    	const clearAll = () => {
    		document.getElementById('searchbox').scrollIntoView({ behavior: 'smooth', block: 'center' });

    		setTimeout(
    			() => {
    				$$invalidate(2, items = []);
    				$$invalidate(0, inputText = "");
    				eraseAllCookies();
    			},
    			1000
    		);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		inputText = this.value;
    		$$invalidate(0, inputText);
    	}

    	const click_handler = () => addItem();
    	const click_handler_1 = () => document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'center' });
    	const click_handler_2 = () => document.getElementById('searchbox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    	const click_handler_3 = () => clearAll();

    	$$self.$capture_state = () => ({
    		getAIResponses,
    		getCookie,
    		setCookie,
    		eraseAllCookies,
    		fade,
    		inputText,
    		sampleSearches,
    		randomPlaceholder,
    		sampleSearch,
    		currCookie,
    		items,
    		addItem,
    		clearAll
    	});

    	$$self.$inject_state = $$props => {
    		if ('inputText' in $$props) $$invalidate(0, inputText = $$props.inputText);
    		if ('sampleSearches' in $$props) sampleSearches = $$props.sampleSearches;
    		if ('sampleSearch' in $$props) $$invalidate(1, sampleSearch = $$props.sampleSearch);
    		if ('currCookie' in $$props) currCookie = $$props.currCookie;
    		if ('items' in $$props) $$invalidate(2, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		inputText,
    		sampleSearch,
    		items,
    		addItem,
    		clearAll,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
      target: document.body,
      props: {},
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
