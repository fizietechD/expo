"use strict";
'use client';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkMenu = void 0;
exports.LinkWithPreview = LinkWithPreview;
exports.LinkMenuAction = LinkMenuAction;
exports.LinkPreview = LinkPreview;
exports.LinkTrigger = LinkTrigger;
const react_1 = __importStar(require("react"));
const hooks_1 = require("../hooks");
const BaseExpoRouterLink_1 = require("./BaseExpoRouterLink");
const HrefPreview_1 = require("./preview/HrefPreview");
const LinkPreviewContext_1 = require("./preview/LinkPreviewContext");
const native_1 = require("./preview/native");
const useNextScreenId_1 = require("./preview/useNextScreenId");
const url_1 = require("../utils/url");
const PreviewRouteContext_1 = require("./preview/PreviewRouteContext");
const Slot_1 = require("../ui/Slot");
const InternalLinkPreviewContext = (0, react_1.createContext)(undefined);
function LinkWithPreview({ children, ...rest }) {
    const router = (0, hooks_1.useRouter)();
    const { setIsPreviewOpen } = (0, LinkPreviewContext_1.useLinkPreviewContext)();
    const [isCurrentPreviewOpen, setIsCurrenPreviewOpen] = (0, react_1.useState)(false);
    const hrefWithoutQuery = String(rest.href).split('?')[0];
    const prevHrefWithoutQuery = (0, react_1.useRef)(hrefWithoutQuery);
    (0, react_1.useEffect)(() => {
        if (isCurrentPreviewOpen) {
            if (prevHrefWithoutQuery.current !== hrefWithoutQuery) {
                throw new Error('Link does not support changing the href prop after the preview has been opened. Please ensure that the href prop is stable and does not change between renders.');
            }
        }
        else {
            prevHrefWithoutQuery.current = hrefWithoutQuery;
        }
    }, [hrefWithoutQuery]);
    const [nextScreenId, updateNextScreenId] = (0, useNextScreenId_1.useNextScreenId)();
    (0, react_1.useEffect)(() => {
        if ((0, url_1.shouldLinkExternally)(String(rest.href))) {
            if (process.env.NODE_ENV !== 'production') {
                throw new Error('External links previews are not supported');
            }
            else {
                console.warn('External links previews are not supported');
            }
        }
        if (rest.replace) {
            if (process.env.NODE_ENV !== 'production') {
                throw new Error('Using replace links with preview is not supported');
            }
            else {
                console.warn('Using replace links with preview is not supported');
            }
        }
    }, [rest.href, rest.replace]);
    const triggerElement = react_1.default.useMemo(() => getFirstChildOfType(children, LinkTrigger), [children]);
    const menuElement = react_1.default.useMemo(() => getFirstChildOfType(children, exports.LinkMenu), [children]);
    const previewElement = react_1.default.useMemo(() => getFirstChildOfType(children, LinkPreview), [children]);
    if ((previewElement || menuElement) && !triggerElement) {
        if (process.env.NODE_ENV !== 'production') {
            throw new Error('When you use Link.Preview, you must use Link.Trigger to specify the trigger element.');
        }
        else {
            console.warn('When you use Link.Preview, you must use Link.Trigger to specify the trigger element.');
        }
    }
    const trigger = react_1.default.useMemo(() => triggerElement ?? <LinkTrigger>{children}</LinkTrigger>, [triggerElement, children]);
    const preview = react_1.default.useMemo(() => previewElement ?? null, [previewElement, rest.href]);
    const isPreviewTapped = (0, react_1.useRef)(false);
    if ((0, url_1.shouldLinkExternally)(String(rest.href)) || rest.replace) {
        return <BaseExpoRouterLink_1.BaseExpoRouterLink children={children} {...rest}/>;
    }
    return (<native_1.NativeLinkPreview nextScreenId={nextScreenId} onWillPreviewOpen={() => {
            isPreviewTapped.current = false;
            router.prefetch(rest.href);
            setIsPreviewOpen(true);
            setIsCurrenPreviewOpen(true);
        }} onDidPreviewOpen={() => {
            updateNextScreenId(rest.href);
        }} onPreviewWillClose={() => {
            // When preview was not tapped, then we need to enable the screen stack animation
            // Otherwise a quick user could tap another link before onDidPreviewClose is called
            if (!isPreviewTapped.current) {
                setIsCurrenPreviewOpen(false);
                setIsPreviewOpen(false);
            }
        }} onPreviewDidClose={() => {
            // If preview was tapped we need to enable the screen stack animation
            // For other cases we did it in onPreviewWillClose
            if (isPreviewTapped.current) {
                setIsCurrenPreviewOpen(false);
                setIsPreviewOpen(false);
            }
        }} onPreviewTapped={() => {
            isPreviewTapped.current = true;
            router.navigate(rest.href, { __internal__PreviewKey: nextScreenId });
        }}>
      <InternalLinkPreviewContext value={{ isVisible: isCurrentPreviewOpen, href: rest.href }}>
        <native_1.NativeLinkPreviewTrigger>
          <BaseExpoRouterLink_1.BaseExpoRouterLink {...rest} children={trigger} ref={rest.ref}/>
        </native_1.NativeLinkPreviewTrigger>
        {preview}
        {menuElement}
      </InternalLinkPreviewContext>
    </native_1.NativeLinkPreview>);
}
function LinkMenuAction(props) {
    if ((0, PreviewRouteContext_1.useIsPreview)() || process.env.EXPO_OS !== 'ios' || !(0, react_1.use)(InternalLinkPreviewContext)) {
        return null;
    }
    const { unstable_keepPresented, onPress, ...rest } = props;
    return (<native_1.NativeLinkPreviewAction {...rest} onSelected={onPress} keepPresented={unstable_keepPresented}/>);
}
const LinkMenu = (props) => {
    if ((0, PreviewRouteContext_1.useIsPreview)() || process.env.EXPO_OS !== 'ios' || !(0, react_1.use)(InternalLinkPreviewContext)) {
        return null;
    }
    const children = react_1.default.Children.toArray(props.children).filter((child) => (0, react_1.isValidElement)(child) && (child.type === LinkMenuAction || child.type === exports.LinkMenu));
    return (<native_1.NativeLinkPreviewAction {...props} title={props.title ?? ''} onSelected={() => { }} children={children}/>);
};
exports.LinkMenu = LinkMenu;
function LinkPreview({ children, width, height }) {
    const internalPreviewContext = (0, react_1.use)(InternalLinkPreviewContext);
    if ((0, PreviewRouteContext_1.useIsPreview)() || process.env.EXPO_OS !== 'ios' || !internalPreviewContext) {
        return null;
    }
    const { isVisible, href } = internalPreviewContext;
    const contentSize = {
        width: width ?? 0,
        height: height ?? 0,
    };
    let content;
    if (children) {
        content = isVisible ? children : null;
    }
    else {
        content = isVisible ? <HrefPreview_1.HrefPreview href={href}/> : null;
    }
    return (<native_1.NativeLinkPreviewContent style={{
            /* Setting default background here, so that the preview is not transparent */
            backgroundColor: '#fff',
        }} preferredContentSize={contentSize}>
      {content}
    </native_1.NativeLinkPreviewContent>);
}
function LinkTrigger(props) {
    if (react_1.default.Children.count(props.children) > 1 || !(0, react_1.isValidElement)(props.children)) {
        // If onPress is passed, this means that Link passed props to this component.
        // We can assume that asChild is used, so we throw an error, because link will not work in this case.
        if (props && typeof props === 'object' && 'onPress' in props) {
            throw new Error('When using Link.Trigger in an asChild Link, you must pass a single child element that will emit onPress event.');
        }
        return props.children;
    }
    return <Slot_1.Slot {...props}/>;
}
function getFirstChildOfType(children, type) {
    return react_1.default.Children.toArray(children).find((child) => (0, react_1.isValidElement)(child) && child.type === type);
}
//# sourceMappingURL=LinkWithPreview.js.map