export interface Point { x: number; y: number }
export interface NodeRect { x: number; y: number; w: number; h: number }

export function buildNodeMap(
    nodes: any[],
    offsetX: number,
    offsetY: number,
    out: Map<string, NodeRect> = new Map()
): Map<string, NodeRect> {
    nodes.forEach((n: any) => {
        const absX = offsetX + (n.x || 0);
        const absY = offsetY + (n.y || 0);
        out.set(n.id, { x: absX, y: absY, w: n.width || 0, h: n.height || 0 });
        if (n.children) {
            buildNodeMap(n.children, absX, absY, out);
        }
    });
    return out;
}

function snapToBoundary(pt: Point, nextPt: Point, rect: NodeRect): Point {
    // Check if point is inside the rect
    if (pt.x > rect.x && pt.x < rect.x + rect.w && pt.y > rect.y && pt.y < rect.y + rect.h) {
        if (Math.abs(pt.x - nextPt.x) < 0.1) {
            return nextPt.y > pt.y ? { x: pt.x, y: rect.y + rect.h } : { x: pt.x, y: rect.y };
        } else if (Math.abs(pt.y - nextPt.y) < 0.1) {
            return nextPt.x > pt.x ? { x: rect.x + rect.w, y: pt.y } : { x: rect.x, y: pt.y };
        }

        // Diagonal fallback
        const dx1 = pt.x - rect.x;
        const dx2 = (rect.x + rect.w) - pt.x;
        const dy1 = pt.y - rect.y;
        const dy2 = (rect.y + rect.h) - pt.y;
        const min = Math.min(dx1, dx2, dy1, dy2);

        if (min === dx1) return { x: rect.x, y: pt.y };
        if (min === dx2) return { x: rect.x + rect.w, y: pt.y };
        if (min === dy1) return { x: pt.x, y: rect.y };
        return { x: pt.x, y: rect.y + rect.h };
    }
    return pt;
}

function collectSectionPoints(sections: any[]): Point[] {
    const pts: Point[] = [];
    sections.forEach((sec: any) => {
        if (pts.length === 0) pts.push(sec.startPoint);
        (sec.bendPoints || []).forEach((bp: any) => pts.push(bp));
        pts.push(sec.endPoint);
    });
    return pts;
}

function getSafeExitPoint(edgePts: Point[], dummyRect: NodeRect, isSource: boolean): Point {
    const cx = dummyRect.x + dummyRect.w / 2;
    const cy = dummyRect.y + dummyRect.h / 2;
    if (!edgePts || edgePts.length < 2) return { x: cx, y: cy };

    if (isSource) {
        // dummyIn - edge STARTS here. Momentum is from p0 to p1.
        // We must enter from the OPPOSITE side.
        const p0 = edgePts[0];
        const p1 = edgePts[1];
        if (Math.abs(p1.y - p0.y) > Math.abs(p1.x - p0.x)) {
            return p1.y > p0.y ? { x: p0.x, y: dummyRect.y } : { x: p0.x, y: dummyRect.y + dummyRect.h };
        } else {
            return p1.x > p0.x ? { x: dummyRect.x, y: p0.y } : { x: dummyRect.x + dummyRect.w, y: p0.y };
        }
    } else {
        // dummyOut - edge ENDS here. Momentum is from pPrev to pLast.
        // We continue out the SAME side.
        const pLast = edgePts[edgePts.length - 1];
        const pPrev = edgePts[edgePts.length - 2];
        if (Math.abs(pLast.y - pPrev.y) > Math.abs(pLast.x - pPrev.x)) {
            return pLast.y > pPrev.y ? { x: pLast.x, y: dummyRect.y + dummyRect.h } : { x: pLast.x, y: dummyRect.y };
        } else {
            return pLast.x > pPrev.x ? { x: dummyRect.x + dummyRect.w, y: pLast.y } : { x: dummyRect.x, y: pLast.y };
        }
    }
}

function smartOrthogonalBridge(p1: Point, p2: Point, srcGroup: NodeRect, tgtGroup: NodeRect, srcInfo: NodeRect, tgtInfo: NodeRect, momentum: Point): { bridge: Point[], hijackedTarget: boolean, hijackedSource: boolean } {
    if (Math.abs(p1.x - p2.x) < 0.1 || Math.abs(p1.y - p2.y) < 0.1) return { bridge: [p1, p2], hijackedTarget: false, hijackedSource: false };

    const isVerticalFlow = Math.abs(momentum.y) >= Math.abs(momentum.x);

    if (isVerticalFlow) {
        const isBottomExit = momentum.y >= 0;
        const isTopExit = momentum.y < 0;

        const srcRight = srcGroup.x + srcGroup.w;
        const tgtRight = tgtGroup.x + tgtGroup.w;

        const isTargetStrictlyRight = tgtGroup.x > srcRight + 20;
        const isTargetStrictlyLeft = srcGroup.x > tgtRight + 20;

        const isBackEdge = (isBottomExit && p2.y < p1.y) || (isTopExit && p2.y > p1.y);

        if (isBackEdge || isTargetStrictlyRight || isTargetStrictlyLeft) {
            let clearX: number;
            let isEnteringFromLeft: boolean;
            let isExitingFromRight: boolean;

            if (isTargetStrictlyRight) {
                clearX = (srcRight + tgtGroup.x) / 2;
                isEnteringFromLeft = true;
                isExitingFromRight = true;
            } else if (isTargetStrictlyLeft) {
                clearX = (srcGroup.x + tgtRight) / 2;
                isEnteringFromLeft = false;
                isExitingFromRight = false;
            } else {
                const routeLeft = Math.min(srcGroup.x, tgtGroup.x) - 30;
                const routeRight = Math.max(srcRight, tgtRight) + 30;

                const targetCenterX = tgtInfo.x + tgtInfo.w / 2;
                if (targetCenterX - routeLeft < routeRight - targetCenterX) {
                    clearX = routeLeft;
                    isEnteringFromLeft = true;
                    isExitingFromRight = false;
                } else {
                    clearX = routeRight;
                    isEnteringFromLeft = false;
                    isExitingFromRight = true;
                }
            }

            const sourceCenterY = srcInfo.y + srcInfo.h / 2;
            const sourceSideX = isExitingFromRight ? srcInfo.x + srcInfo.w : srcInfo.x;

            const targetCenterY = tgtInfo.y + tgtInfo.h / 2;
            const targetSideX = isEnteringFromLeft ? tgtInfo.x : tgtInfo.x + tgtInfo.w;

            return {
                bridge: [
                    { x: sourceSideX, y: sourceCenterY },
                    { x: clearX, y: sourceCenterY },
                    { x: clearX, y: targetCenterY },
                    { x: targetSideX, y: targetCenterY }
                ],
                hijackedTarget: true,
                hijackedSource: true
            };
        }

        const midY = (p1.y + p2.y) / 2;
        return { bridge: [p1, { x: p1.x, y: midY }, { x: p2.x, y: midY }, p2], hijackedTarget: false, hijackedSource: false };

    } else {
        const isRightExit = momentum.x >= 0;
        const isLeftExit = momentum.x < 0;

        const srcBottom = srcGroup.y + srcGroup.h;
        const tgtBottom = tgtGroup.y + tgtGroup.h;

        const isTargetStrictlyBelow = tgtGroup.y > srcBottom + 20;
        const isTargetStrictlyAbove = srcGroup.y > tgtBottom + 20;

        const isBackEdge = (isRightExit && p2.x < p1.x) || (isLeftExit && p2.x > p1.x);

        if (isBackEdge || isTargetStrictlyBelow || isTargetStrictlyAbove) {
            let clearY: number;
            let isEnteringFromTop: boolean;
            let isExitingFromBottom: boolean;

            if (isTargetStrictlyBelow) {
                clearY = (srcBottom + tgtGroup.y) / 2;
                isEnteringFromTop = true;
                isExitingFromBottom = true;
            } else if (isTargetStrictlyAbove) {
                clearY = (srcGroup.y + tgtBottom) / 2;
                isEnteringFromTop = false;
                isExitingFromBottom = false;
            } else {
                const routeTop = Math.min(srcGroup.y, tgtGroup.y) - 30;
                const routeBottom = Math.max(srcBottom, tgtBottom) + 30;

                const targetCenterY = tgtInfo.y + tgtInfo.h / 2;
                if (targetCenterY - routeTop < routeBottom - targetCenterY) {
                    clearY = routeTop;
                    isEnteringFromTop = true;
                    isExitingFromBottom = false;
                } else {
                    clearY = routeBottom;
                    isEnteringFromTop = false;
                    isExitingFromBottom = true;
                }
            }

            const sourceCenterX = srcInfo.x + srcInfo.w / 2;
            const sourceSideY = isExitingFromBottom ? srcInfo.y + srcInfo.h : srcInfo.y;

            const targetCenterX = tgtInfo.x + tgtInfo.w / 2;
            const targetSideY = isEnteringFromTop ? tgtInfo.y : tgtInfo.y + tgtInfo.h;

            return {
                bridge: [
                    { x: sourceCenterX, y: sourceSideY },
                    { x: sourceCenterX, y: clearY },
                    { x: targetCenterX, y: clearY },
                    { x: targetCenterX, y: targetSideY }
                ],
                hijackedTarget: true,
                hijackedSource: true
            };
        }

        const midX = (p1.x + p2.x) / 2;
        return { bridge: [p1, { x: midX, y: p1.y }, { x: midX, y: p2.y }, p2], hijackedTarget: false, hijackedSource: false };
    }
}

export interface EdgePath {
    points: Point[];
}

export function computeEdgePaths(
    edge: any,
    crossGroupEdges: Record<string, { sourceId: string; targetId: string; sourceGroupId: string; targetGroupId: string; inSections?: any[]; outSections?: any[]; dummyInRect?: NodeRect; dummyOutRect?: NodeRect }>,
    nodeMap: Map<string, NodeRect>
): EdgePath[] {
    const cgMeta = crossGroupEdges[edge.id];

    if (cgMeta && nodeMap.has(cgMeta.sourceId) && nodeMap.has(cgMeta.targetId)) {
        const srcInfo = nodeMap.get(cgMeta.sourceId)!;
        const tgtInfo = nodeMap.get(cgMeta.targetId)!;
        const srcGroupInfo = nodeMap.get(cgMeta.sourceGroupId) || srcInfo;
        const tgtGroupInfo = nodeMap.get(cgMeta.targetGroupId) || tgtInfo;

        const finalPts: Point[] = [];

        let bridgeStart = { x: srcInfo.x + srcInfo.w / 2, y: srcInfo.y + srcInfo.h / 2 };
        let bridgeEnd = { x: tgtInfo.x + tgtInfo.w / 2, y: tgtInfo.y + tgtInfo.h / 2 };

        let bridgeStartMomentum = { x: 0, y: 1 }; // default DOWN
        let outPts: Point[] = [];

        if (cgMeta.outSections && cgMeta.outSections.length > 0) {
            outPts = collectSectionPoints(cgMeta.outSections);
            if (outPts.length > 0) {
                if (outPts.length > 1) {
                    const pLast = outPts[outPts.length - 1];
                    const pPrev = outPts[outPts.length - 2];
                    bridgeStartMomentum = { x: pLast.x - pPrev.x, y: pLast.y - pPrev.y };
                }
                if (cgMeta.dummyOutRect) {
                    bridgeStart = getSafeExitPoint(outPts, cgMeta.dummyOutRect, false);
                } else {
                    bridgeStart = outPts[outPts.length - 1];
                }
            }
        }

        let inPts: Point[] = [];
        if (cgMeta.inSections && cgMeta.inSections.length > 0) {
            inPts = collectSectionPoints(cgMeta.inSections);
            if (inPts.length > 0) {
                if (cgMeta.dummyInRect) {
                    bridgeEnd = getSafeExitPoint(inPts, cgMeta.dummyInRect, true);
                } else {
                    bridgeEnd = inPts[0];
                }
            }
        }

        const { bridge, hijackedTarget, hijackedSource } = smartOrthogonalBridge(bridgeStart, bridgeEnd, srcGroupInfo, tgtGroupInfo, srcInfo, tgtInfo, bridgeStartMomentum);

        if (hijackedSource) {
            outPts = [];
        } else {
            if (outPts.length > 0) {
                finalPts.push(...outPts);
            }
            finalPts.push(bridgeStart);
        }

        for (let i = (hijackedSource ? 0 : 1); i < bridge.length; i++) {
            finalPts.push(bridge[i]);
        }

        if (hijackedTarget) {
            inPts = [];
        }

        if (cgMeta.dummyInRect && inPts.length > 0) finalPts.push(inPts[0]);
        for (let i = 1; i < inPts.length; i++) finalPts.push(inPts[i]);

        if (!cgMeta.inSections || inPts.length === 0) {
            if (!hijackedTarget) finalPts.push(bridgeEnd);
        }

        // Ensure ends are on the boundary
        if (finalPts.length >= 2) {
            finalPts[0] = snapToBoundary(finalPts[0], finalPts[1], srcInfo);
            finalPts[finalPts.length - 1] = snapToBoundary(
                finalPts[finalPts.length - 1],
                finalPts[finalPts.length - 2],
                tgtInfo
            );
        }

        const uniquePts = finalPts.filter((pt, i, arr) => {
            if (i === 0) return true;
            const prev = arr[i - 1];
            return Math.abs(pt.x - prev.x) > 0.1 || Math.abs(pt.y - prev.y) > 0.1;
        });

        return [{ points: uniquePts }];
    }

    const sections = edge.sections || [];
    return sections.map((section: any) => {
        const pts: Point[] = [section.startPoint];
        (section.bendPoints || []).forEach((bp: any) => pts.push(bp));
        pts.push(section.endPoint);
        return { points: pts };
    });
}
