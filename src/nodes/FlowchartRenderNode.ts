import { RenderNode, type InputDefinition } from '@tracereactive/types';
import { FlowchartCategory } from '../categories';
import { buildNodeMap, computeEdgePaths } from '../utils/flowchartEdgeUtils';
import { getSvgFillAttributes, getSvgStrokeAttributes, getStrokeDashArray, getSvgBackgroundStyle, parseSvgColor } from '../utils/flowchartColorUtils';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

// Helper to estimate text width roughly based on characters
function wrapText(text: string, charsPerLine: number): string[] {
    if (!text) return [];
    const lines = String(text).split('\n');
    if (charsPerLine <= 0) return lines;
    const wrappedLines: string[] = [];
    for (const line of lines) {
        if (line.length <= charsPerLine) {
            wrappedLines.push(line);
        } else {
            const words = line.split(' ');
            let currentLine = '';
            for (const word of words) {
                if (currentLine.length + word.length + (currentLine ? 1 : 0) > charsPerLine) {
                    if (currentLine) {
                        wrappedLines.push(currentLine);
                        currentLine = '';
                    }
                    if (word.length > charsPerLine) {
                        let w = word;
                        while (w.length > charsPerLine) {
                            wrappedLines.push(w.substring(0, charsPerLine));
                            w = w.substring(charsPerLine);
                        }
                        currentLine = w;
                    } else {
                        currentLine = word;
                    }
                } else {
                    currentLine = currentLine ? currentLine + ' ' + word : word;
                }
            }
            if (currentLine) {
                wrappedLines.push(currentLine);
            }
        }
    }
    return wrappedLines;
}

function estimateDimensions(text: string, fontSize: number, padding: number, fixedWidth?: number): { width: number, height: number } {
    let totalLines = 0;
    let maxChars = 0;

    if (fixedWidth && fixedWidth > 0) {
        const availableWidth = fixedWidth - padding * 2;
        const charsPerLine = Math.max(1, Math.floor(availableWidth / (fontSize * 0.6)));
        const wrapped = wrapText(text, charsPerLine);
        totalLines = wrapped.length;
        maxChars = Math.max(...wrapped.map(l => l.length), 0);
    } else {
        const lines = String(text || '').split('\n');
        maxChars = Math.max(...lines.map(l => l.length), 0);
        totalLines = lines.length;
    }

    const width = fixedWidth && fixedWidth > 0 ? fixedWidth : Math.max(80, maxChars * fontSize * 0.6 + padding * 2 + 20);
    const height = Math.max(50, totalLines * fontSize * 1.2 + padding * 2 + 10);
    return { width, height };
}

function estimateLabelDimensions(text: string, fontSize: number, padding: number): { width: number, height: number } {
    const lines = String(text || '').split('\n');
    const maxChars = Math.max(...lines.map(l => l.length), 0);
    const width = Math.max(30, maxChars * fontSize * 0.6 + padding * 2 + 10);
    const height = Math.max(20, lines.length * fontSize * 1.2 + padding * 2 + 4);
    return { width, height };
}

export class FlowchartRenderNode extends RenderNode {
    readonly typeId = 'flowchart-render';
    readonly displayName = 'Flowchart';
    readonly category = FlowchartCategory;
    readonly visible = true;
    readonly dynamicInputs = { baseName: 'Node', acceptsType: 'flowchart' };
    readonly inputs: InputDefinition[] = [];
    readonly properties = [
        {
            name: 'direction',
            type: 'select' as const,
            defaultValue: 'DOWN',
            options: [
                { label: 'Top to Bottom', value: 'DOWN' },
                { label: 'Left to Right', value: 'RIGHT' },
                { label: 'Bottom to Top', value: 'UP' },
                { label: 'Right to Left', value: 'LEFT' }
            ]
        },
        { name: 'nodeSpacing', type: 'number' as const, defaultValue: 40, min: 0 },
        { name: 'layerSpacing', type: 'number' as const, defaultValue: 50, min: 0 },
        { name: 'backgroundColor', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:com.tracereactive.flowcharts.flowchartBackgroundColor' },
        { name: 'edgeColor', label: 'Edge color', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:com.tracereactive.flowcharts.flowchartEdgeColor' }
    ];
    readonly outputs = [
        { name: 'Render', outputType: 'render' }
    ];



    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const shapes = [];
        for (let i = 1; i <= 100; i++) {
            if (inputs[`Node ${i}`]) {
                shapes.push(inputs[`Node ${i}`]);
            }
        }

        const nodesMap = new Map<string, any>();
        const edges: any[] = [];
        const visited = new Set<string>();

        const resolveIncoming = (inc: any, currentLabels: any[] = []): { sourceNode: any, labels: any[] }[] => {
            if (!inc) return [];
            const labels: any[] = [...currentLabels];
            let curr = inc;
            const labelVisited = new Set<string>();

            while (curr && curr.isEdgeLabel) {
                if (curr.id && labelVisited.has(curr.id)) break;
                if (curr.id) labelVisited.add(curr.id);

                if (curr.text) {
                    labels.push({
                        id: `l_${curr.id}`,
                        text: curr.text,
                        width: curr.width ?? estimateLabelDimensions(curr.text, parseFloat(String(curr.fontSize)) || 11, parseFloat(String(curr.padding)) || 2).width,
                        height: curr.height ?? estimateLabelDimensions(curr.text, parseFloat(String(curr.fontSize)) || 11, parseFloat(String(curr.padding)) || 2).height,
                        padding: curr.padding,
                        backgroundColor: curr.backgroundColor,
                        textColor: curr.textColor,
                        borderColor: curr.borderColor,
                        borderWidth: curr.borderWidth,
                        borderRadius: curr.borderRadius,
                        fontSize: curr.fontSize
                    });
                }

                const next = curr.sourceShape || (curr.incoming && curr.incoming[0]);
                if (!next || next === curr) break;
                curr = next;
            }

            if (!curr || curr.isEdgeLabel) return [];
            
            if (curr.isCombine) {
                const results: { sourceNode: any, labels: any[] }[] = [];
                if (curr.incoming && Array.isArray(curr.incoming)) {
                    for (const combineInc of curr.incoming) {
                        results.push(...resolveIncoming(combineInc, labels));
                    }
                }
                return results;
            }

            return [{ sourceNode: curr, labels }];
        };

        // Traverse the connected graph
        const queue = [...shapes];
        while (queue.length > 0) {
            const current = queue.shift();
            if (!current || !current.id || visited.has(current.id)) continue;
            visited.add(current.id);

            // If a label node was directly passed, push its real source shape
            if (current.isEdgeLabel || current.isCombine) {
                const resolvedList = resolveIncoming(current);
                for (const resolved of resolvedList) {
                    if (resolved.sourceNode) {
                        queue.push(resolved.sourceNode);
                    }
                }
                continue;
            }

            nodesMap.set(current.id, current);

            // Traverse incoming edges
            if (current.incoming && Array.isArray(current.incoming)) {
                for (const inc of current.incoming) {
                    const resolvedList = resolveIncoming(inc);
                    for (const resolved of resolvedList) {
                        if (resolved.sourceNode) {
                            queue.push(resolved.sourceNode);
                            if (!current.isCombine) {
                                let sourceId = resolved.sourceNode.id;
                                edges.push({
                                    id: `e_${sourceId}_${current.id}`,
                                    sources: [sourceId],
                                    targets: [current.id],
                                    labels: resolved.labels
                                });
                            }
                        }
                    }
                }
            }

            // Traverse group roots without creating edges
            if (current.groupRoots && Array.isArray(current.groupRoots)) {
                for (const root of current.groupRoots) {
                    const resolvedList = resolveIncoming(root);
                    for (const resolved of resolvedList) {
                        if (resolved.sourceNode) {
                            queue.push(resolved.sourceNode);
                        }
                    }
                }
            }
        }

        const flatNodes = Array.from(nodesMap.values());
        const elkNodesMap = new Map<string, any>();
        const elkNodes: any[] = [];

        // First pass: create all ELK nodes (both standard and groups)
        flatNodes.forEach(n => {
            if (n.isCombine) return;
            const parsedWidth = parseFloat(String(n.width));
            const fixedWidth = !isNaN(parsedWidth) && parsedWidth > 0 ? parsedWidth : undefined;
            const dims = estimateDimensions(n.text || '', 13, parseFloat(String(n.padding)) || 10, fixedWidth);

            if (n.isGroup) {
                const basePad = parseFloat(String(n.padding)) || 10;
                let topPad = basePad;
                let bottomPad = basePad;
                let leftPad = basePad;
                let rightPad = basePad;

                if (n.title) {
                    const pos = n.titlePosition || 'top-center';
                    if (pos.includes('top')) topPad += 35;
                    else if (pos.includes('bottom')) bottomPad += 35;
                    else if (pos.includes('left')) leftPad += 35;
                    else if (pos.includes('right')) rightPad += 35;
                }

                const layoutOptions: Record<string, string> = {
                    'elk.padding': `[top=${topPad},left=${leftPad},bottom=${bottomPad},right=${rightPad}]`,
                    'elk.algorithm': 'layered',
                    'elk.spacing.nodeNode': String(n.nodeSpacing ?? 15),
                    'elk.layered.spacing.nodeNodeBetweenLayers': String(n.layerSpacing ?? 20)
                };

                if (n.direction && n.direction !== 'INHERIT') {
                    layoutOptions['elk.direction'] = n.direction;
                }

                elkNodesMap.set(n.id, {
                    id: n.id,
                    children: [],
                    shapeData: n,
                    layoutOptions
                });
            } else {
                elkNodesMap.set(n.id, {
                    id: n.id,
                    width: n.width ?? dims.width,
                    height: n.height ?? dims.height,
                    shapeData: n
                });
            }
        });

        // Second pass: assign nodes to their groups
        flatNodes.forEach(n => {
            const elkNode = elkNodesMap.get(n.id);
            if (n.groupId && elkNodesMap.has(n.groupId) && n.id !== n.groupId) {
                const parent = elkNodesMap.get(n.groupId);
                if (parent.children) {
                    parent.children.push(elkNode);
                } else {
                    elkNodes.push(elkNode); // Should not happen for groups
                }
            } else {
                elkNodes.push(elkNode);
            }
        });

        // Dedup edges by ID in case of multiple paths
        const uniqueEdgesMap = new Map<string, any>();
        for (const e of edges) {
            if (!uniqueEdgesMap.has(e.id)) {
                uniqueEdgesMap.set(e.id, e);
            }
        }
        const allElkEdges = Array.from(uniqueEdgesMap.values());
        const rootEdges: any[] = [];

        const crossGroupEdges: Record<string, any> = {};

        allElkEdges.forEach(e => {
            const srcNode = flatNodes.find(n => n.id === e.sources[0]);
            const tgtNode = flatNodes.find(n => n.id === e.targets[0]);

            if (srcNode && tgtNode && srcNode.groupId && tgtNode.groupId && srcNode.groupId === tgtNode.groupId) {
                const groupElkNode = elkNodesMap.get(srcNode.groupId);
                if (groupElkNode) {
                    if (!groupElkNode.edges) groupElkNode.edges = [];
                    groupElkNode.edges.push(e);
                } else {
                    rootEdges.push(e);
                }
            } else {
                const sourceGroup = srcNode?.groupId ? srcNode.groupId : srcNode?.id;
                const targetGroup = tgtNode?.groupId ? tgtNode.groupId : tgtNode?.id;

                if (sourceGroup && targetGroup) {
                    rootEdges.push({
                        id: e.id,
                        sources: [sourceGroup],
                        targets: [targetGroup],
                        labels: e.labels
                    });

                    const actualSourceId = srcNode?.isGroup && srcNode.groupRoots?.length > 0 ? srcNode.groupRoots[0].id : srcNode?.id;
                    const actualTargetId = tgtNode?.id;

                    if (actualSourceId && actualTargetId) {
                        if (sourceGroup !== actualSourceId || targetGroup !== actualTargetId) {
                            const cgMeta: any = {
                                sourceId: actualSourceId,
                                targetId: actualTargetId,
                                sourceGroupId: sourceGroup,
                                targetGroupId: targetGroup
                            };
                            crossGroupEdges[e.id] = cgMeta;

                            if (targetGroup !== actualTargetId && tgtNode?.groupId) {
                                const targetGroupElk = elkNodesMap.get(tgtNode.groupId);
                                if (targetGroupElk) {
                                    const dummyId = `dummy_in_${e.id}`;
                                    const sourceElkNode = elkNodesMap.get(actualSourceId);
                                    const sWidth = sourceElkNode?.width || 100;
                                    const sHeight = sourceElkNode?.height || 50;

                                    if (!targetGroupElk.children) targetGroupElk.children = [];
                                    targetGroupElk.children.push({
                                        id: dummyId,
                                        width: sWidth,
                                        height: sHeight,
                                        layoutOptions: {
                                            'elk.layered.layering.layerConstraint': 'FIRST',
                                            'elk.spacing.nodeNode': '0',
                                            'elk.layered.spacing.nodeNodeBetweenLayers': '0'
                                        }
                                    });

                                    if (!targetGroupElk.edges) targetGroupElk.edges = [];
                                    targetGroupElk.edges.push({ id: `dummy_edge_in_${e.id}`, sources: [dummyId], targets: [actualTargetId] });
                                    cgMeta.dummyInId = dummyId;
                                }
                            }
                            if (sourceGroup !== actualSourceId && srcNode?.groupId) {
                                const sourceGroupElk = elkNodesMap.get(srcNode.groupId);
                                if (sourceGroupElk) {
                                    const dummyId = `dummy_out_${e.id}`;
                                    const targetElkNode = elkNodesMap.get(actualTargetId);
                                    const tWidth = targetElkNode?.width || 100;
                                    const tHeight = targetElkNode?.height || 50;

                                    if (!sourceGroupElk.children) sourceGroupElk.children = [];
                                    sourceGroupElk.children.push({
                                        id: dummyId,
                                        width: tWidth,
                                        height: tHeight,
                                        layoutOptions: {
                                            'elk.layered.layering.layerConstraint': 'LAST',
                                            'elk.spacing.nodeNode': '0',
                                            'elk.layered.spacing.nodeNodeBetweenLayers': '0'
                                        }
                                    });

                                    if (!sourceGroupElk.edges) sourceGroupElk.edges = [];
                                    sourceGroupElk.edges.push({ id: `dummy_edge_out_${e.id}`, sources: [actualSourceId], targets: [dummyId] });
                                    cgMeta.dummyOutId = dummyId;
                                }
                            }
                        }
                    }
                } else {
                    rootEdges.push(e);
                }
            }
        });

        const graph = {
            id: 'root',
            layoutOptions: {
                'elk.algorithm': 'layered',
                'elk.direction': properties['direction'] || 'DOWN',
                'elk.hierarchyHandling': 'SEPARATE_CHILDREN',
                'elk.spacing.nodeNode': String(properties['nodeSpacing'] ?? 40),
                'elk.layered.spacing.nodeNodeBetweenLayers': String(properties['layerSpacing'] ?? 50),
                'elk.edgeRouting': 'ORTHOGONAL',
                'elk.edgeLabels.inline': 'true',
                'elk.edgeLabels.placement': 'CENTER'
            },
            children: elkNodes,
            edges: rootEdges
        };

        let layoutResult: any = null;
        try {
            if (elkNodes.length > 0) {
                layoutResult = await elk.layout(graph);
            } else {
                layoutResult = { children: [], edges: [] };
            }
        } catch (err) {
            console.error('ELK Layout error:', err);
            layoutResult = { children: [], edges: [] };
        }

        const dummyCoords = new Map<string, { x: number, y: number, w: number, h: number }>();
        const extractDummyEdges = (node: any, offsetX = 0, offsetY = 0) => {
            const absX = offsetX + (node.x || 0);
            const absY = offsetY + (node.y || 0);

            if (node.id && (node.id.startsWith('dummy_in_') || node.id.startsWith('dummy_out_'))) {
                dummyCoords.set(node.id, { x: absX, y: absY, w: node.width || 40, h: node.height || 40 });
            }

            if (node.edges) {
                node.edges.forEach((e: any) => {
                    if (e.id.startsWith('dummy_edge_in_')) {
                        const rootEdgeId = e.id.replace('dummy_edge_in_', '');
                        const cgMeta = crossGroupEdges[rootEdgeId] as any;
                        if (cgMeta && e.sections) {
                            cgMeta.inSections = e.sections.map((sec: any) => ({
                                ...sec,
                                startPoint: { x: sec.startPoint.x + absX, y: sec.startPoint.y + absY },
                                endPoint: { x: sec.endPoint.x + absX, y: sec.endPoint.y + absY },
                                bendPoints: (sec.bendPoints || []).map((bp: any) => ({ x: bp.x + absX, y: bp.y + absY }))
                            }));
                        }
                    }
                    if (e.id.startsWith('dummy_edge_out_')) {
                        const rootEdgeId = e.id.replace('dummy_edge_out_', '');
                        const cgMeta = crossGroupEdges[rootEdgeId] as any;
                        if (cgMeta && e.sections) {
                            cgMeta.outSections = e.sections.map((sec: any) => ({
                                ...sec,
                                startPoint: { x: sec.startPoint.x + absX, y: sec.startPoint.y + absY },
                                endPoint: { x: sec.endPoint.x + absX, y: sec.endPoint.y + absY },
                                bendPoints: (sec.bendPoints || []).map((bp: any) => ({ x: bp.x + absX, y: bp.y + absY }))
                            }));
                        }
                    }
                });
            }
            if (node.children) {
                node.children.forEach((c: any) => extractDummyEdges(c, absX, absY));
            }
        };

        if (layoutResult) {
            const shiftLayout = (node: any) => {
                if (node.children) {
                    node.children.forEach(shiftLayout);

                    const realChildren = node.children.filter((c: any) => !c.id.startsWith('dummy_in_') && !c.id.startsWith('dummy_out_'));
                    
                    if (realChildren.length > 0 && node.layoutOptions?.['elk.padding']) {
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        realChildren.forEach((c: any) => {
                            if (c.x < minX) minX = c.x;
                            if (c.y < minY) minY = c.y;
                            if (c.x + (c.width || 0) > maxX) maxX = c.x + (c.width || 0);
                            if (c.y + (c.height || 0) > maxY) maxY = c.y + (c.height || 0);
                        });

                        const match = node.layoutOptions['elk.padding'].match(/\[top=(.+),left=(.+),bottom=(.+),right=(.+)\]/);
                        let topPad = 10, leftPad = 10, bottomPad = 10, rightPad = 10;
                        if (match) {
                            topPad = parseFloat(match[1]) || 10;
                            leftPad = parseFloat(match[2]) || 10;
                            bottomPad = parseFloat(match[3]) || 10;
                            rightPad = parseFloat(match[4]) || 10;
                        }

                        if (maxX > -Infinity && maxY > -Infinity) {
                            const dx = leftPad - minX;
                            const dy = topPad - minY;

                            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                                const applyShift = (n: any) => {
                                    if (n.x !== undefined) n.x += dx;
                                    if (n.y !== undefined) n.y += dy;
                                    if (n.children) n.children.forEach(applyShift);
                                    if (n.edges) {
                                        n.edges.forEach((e: any) => {
                                            if (e.sections) {
                                                e.sections.forEach((sec: any) => {
                                                    if (sec.startPoint) { sec.startPoint.x += dx; sec.startPoint.y += dy; }
                                                    if (sec.endPoint) { sec.endPoint.x += dx; sec.endPoint.y += dy; }
                                                    if (sec.bendPoints) {
                                                        sec.bendPoints.forEach((bp: any) => { bp.x += dx; bp.y += dy; });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                };
                                node.children.forEach(applyShift);
                                if (node.edges) {
                                    node.edges.forEach((e: any) => {
                                        if (e.sections) {
                                            e.sections.forEach((sec: any) => {
                                                if (sec.startPoint) { sec.startPoint.x += dx; sec.startPoint.y += dy; }
                                                if (sec.endPoint) { sec.endPoint.x += dx; sec.endPoint.y += dy; }
                                                if (sec.bendPoints) {
                                                    sec.bendPoints.forEach((bp: any) => { bp.x += dx; bp.y += dy; });
                                                }
                                            });
                                        }
                                    });
                                }
                                
                                maxX += dx;
                                maxY += dy;
                            }

                            node.width = maxX + rightPad;
                            node.height = maxY + bottomPad;
                        }
                    }
                }
            };

            shiftLayout(layoutResult);
            extractDummyEdges(layoutResult);

            Object.keys(crossGroupEdges).forEach(edgeId => {
                const edge = crossGroupEdges[edgeId] as any;
                if (edge.dummyInId) {
                    edge.dummyInRect = dummyCoords.get(edge.dummyInId);
                }
                if (edge.dummyOutId) {
                    edge.dummyOutRect = dummyCoords.get(edge.dummyOutId);
                }
            });

            const removeDummies = (node: any) => {
                if (node.children) {
                    node.children = node.children.filter((c: any) => !c.id.startsWith('dummy_in_') && !c.id.startsWith('dummy_out_'));
                    node.children.forEach(removeDummies);
                }
                if (node.edges) {
                    node.edges = node.edges.filter((e: any) => !e.id.startsWith('dummy_edge_'));
                }
            };
            removeDummies(layoutResult);
        }

        const bgStyle = getSvgBackgroundStyle(properties['backgroundColor']);
        const edgeColorParsed = parseSvgColor(properties['edgeColor'], '#f7eee2');
        const edgeColor = edgeColorParsed.color === 'none' ? '#f7eee2' : edgeColorParsed.color;
        let edgeStrokeAttrs = `stroke="${edgeColor}" stroke-width="2"`;
        if (edgeColorParsed.opacity !== undefined && edgeColorParsed.opacity < 1) {
            edgeStrokeAttrs += ` stroke-opacity="${edgeColorParsed.opacity}"`;
        }

        let layoutWidth = layoutResult?.width || 500;
        let layoutHeight = layoutResult?.height || 500;
        if (layoutWidth < 10) layoutWidth = 500;
        if (layoutHeight < 10) layoutHeight = 500;

        let svgContent = `<svg width="${layoutWidth}" height="${layoutHeight}" viewBox="0 0 ${layoutWidth} ${layoutHeight}"${bgStyle} xmlns="http://www.w3.org/2000/svg">`;
        
        // Defs for arrowhead
        const markerId = `arrowhead-${Math.random().toString(36).substr(2, 9)}`;
        const markerFill = edgeColor;
        const markerFillOpacity = (edgeColorParsed.opacity !== undefined && edgeColorParsed.opacity < 1)
            ? ` fill-opacity="${edgeColorParsed.opacity}"`
            : '';
        svgContent += `<defs>
            <marker id="${markerId}" viewBox="0 -5 10 10" refX="10" refY="0" orient="auto" markerWidth="6" markerHeight="6" xoverflow="visible">
                <path d="M 0,-5 L 10 ,0 L 0,5" fill="${markerFill}"${markerFillOpacity} stroke="none" />
            </marker>
        </defs>`;

        const nodeMap = buildNodeMap(layoutResult?.children || [], 0, 0);

        const generateEdgesSvg = (edgesToRender: any[]): string => {
            let svg = '';
            edgesToRender.forEach((edge: any) => {
                const paths = computeEdgePaths(edge, crossGroupEdges, nodeMap);
                paths.forEach(({ points }) => {
                    let d = `M ${points[0].x},${points[0].y}`;
                    for (let i = 1; i < points.length; i++) {
                        d += ` L ${points[i].x},${points[i].y}`;
                    }
                    svg += `<path d="${d}" fill="none" ${edgeStrokeAttrs} marker-end="url(#${markerId})" />`;
                });

                if (edge.labels && edge.labels.length > 0) {
                    edge.labels.forEach((label: any) => {
                        if (!label.text) return;
                        
                        const lw = label.width || 40;
                        const lh = label.height || 22;
                        
                        let lx: number | undefined;
                        let ly: number | undefined;
                        
                        const sections = edge.sections || [];
                        if (sections.length > 0) {
                            const sec = sections[0];
                            const pts = [
                                sec.startPoint,
                                ...(sec.bendPoints || []),
                                sec.endPoint
                            ].filter(Boolean);

                            if (pts.length >= 2) {
                                let totalLen = 0;
                                const lens: number[] = [];
                                for (let i = 0; i < pts.length - 1; i++) {
                                    const dx = pts[i+1].x - pts[i].x;
                                    const dy = pts[i+1].y - pts[i].y;
                                    const l = Math.sqrt(dx * dx + dy * dy);
                                    lens.push(l);
                                    totalLen += l;
                                }

                                const half = totalLen / 2;
                                let acc = 0;
                                let midPt = pts[0];
                                for (let i = 0; i < lens.length; i++) {
                                    if (acc + lens[i] >= half) {
                                        const rem = half - acc;
                                        const t = lens[i] > 0 ? rem / lens[i] : 0;
                                        midPt = {
                                            x: pts[i].x + t * (pts[i+1].x - pts[i].x),
                                            y: pts[i].y + t * (pts[i+1].y - pts[i].y)
                                        };
                                        break;
                                    }
                                    acc += lens[i];
                                }
                                lx = midPt.x - lw / 2;
                                ly = midPt.y - lh / 2;
                            }
                        }

                        if (lx === undefined) lx = (label.x || 0) - lw / 2;
                        if (ly === undefined) ly = (label.y || 0) - lh / 2;
                        
                        const labelFillAttrs = getSvgFillAttributes(label.backgroundColor, '#2C2D2F');
                        const labelStrokeAttrs = getSvgStrokeAttributes(label.borderColor, label.borderStyle, '#444444');
                        const labelTextParsed = parseSvgColor(label.textColor, '#f7eee2');
                        const textColor = labelTextParsed.color === 'none' ? '#f7eee2' : labelTextParsed.color;
                        const labelTextOpacityAttr = (labelTextParsed.opacity !== undefined && labelTextParsed.opacity < 1)
                            ? ` fill-opacity="${labelTextParsed.opacity}"`
                            : '';

                        const borderWidth = label.borderWidth ?? 1;
                        const borderRadius = label.borderRadius ?? 4;
                        const fontSize = label.fontSize ?? 11;
                        
                        svg += `<rect x="${lx}" y="${ly}" width="${lw}" height="${lh}" ${labelFillAttrs} ${labelStrokeAttrs} stroke-width="${borderWidth}" rx="${borderRadius}" ry="${borderRadius}" />`;
                        
                        const lines = String(label.text || '').split('\\n');
                        const lineHeight = 1.2;
                        
                        svg += `<text x="${lx + lw/2}" y="${ly + lh/2}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}"${labelTextOpacityAttr} font-size="${fontSize}px" font-weight="500">`;
                        lines.forEach((line, i) => {
                            const dy = i === 0 ? `-${(lines.length - 1) * lineHeight / 2}em` : `${lineHeight}em`;
                            svg += `<tspan x="${lx + lw/2}" dy="${dy}">${line}</tspan>`;
                        });
                        svg += `</text>`;
                    });
                }
            });
            return svg;
        };

        const generateNodesSvg = (nodes: any[], offsetX = 0, offsetY = 0): string => {
            let svg = '';
            nodes.forEach(node => {
                const shapeData = node.shapeData || {};
                const absX = offsetX + (node.x || 0);
                const absY = offsetY + (node.y || 0);
                
                const w = node.width || 0;
                const h = node.height || 0;
                const type = shapeData.type;
                const padding = shapeData.padding ?? 10;
                const isGroup = type === 'flowchart-group';
                
                const fillAttrs = getSvgFillAttributes(shapeData.fillColor, isGroup ? 'none' : '#1D1E1F');
                const strokeAttrs = getSvgStrokeAttributes(shapeData.borderColor, shapeData.borderStyle, isGroup ? '#c084fc' : '#000000');
                const strokeWidth = shapeData.borderWidth ?? 2;
                const dash = getStrokeDashArray(shapeData.borderStyle, isGroup ? 'dashed' : 'solid');
                const dashAttr = dash ? ` stroke-dasharray="${dash}"` : '';
                
                svg += `<g transform="translate(${absX}, ${absY})">`;
                
                if (type === 'flowchart-oval') {
                    svg += `<ellipse cx="${w/2}" cy="${h/2}" rx="${w/2}" ry="${h/2}" ${fillAttrs} ${strokeAttrs} stroke-width="${strokeWidth}"${dashAttr} />`;
                } else if (type === 'flowchart-rectangle') {
                    const rx = shapeData.borderRadius ?? 8;
                    svg += `<rect width="${w}" height="${h}" rx="${rx}" ry="${rx}" ${fillAttrs} ${strokeAttrs} stroke-width="${strokeWidth}"${dashAttr} />`;
                } else if (type === 'flowchart-diamond') {
                    const points = `${w/2},0 ${w},${h/2} ${w/2},${h} 0,${h/2}`;
                    svg += `<polygon points="${points}" ${fillAttrs} ${strokeAttrs} stroke-width="${strokeWidth}"${dashAttr} />`;
                } else if (type === 'flowchart-parallelogram') {
                    const skew = 15;
                    const points = `${skew},0 ${w},0 ${w-skew},${h} 0,${h}`;
                    svg += `<polygon points="${points}" ${fillAttrs} ${strokeAttrs} stroke-width="${strokeWidth}"${dashAttr} />`;
                } else if (type === 'flowchart-group') {
                    const rx = shapeData.borderRadius ?? 8;
                    svg += `<rect width="${w}" height="${h}" rx="${rx}" ry="${rx}" ${fillAttrs} ${strokeAttrs} stroke-width="${strokeWidth}"${dashAttr} />`;
                    
                    if (shapeData.title) {
                        const titleColorParsed = parseSvgColor(shapeData.titleColor, shapeData.textColor || '#f7eee2');
                        const textColor = titleColorParsed.color === 'none' ? '#f7eee2' : titleColorParsed.color;
                        const titleOpacityAttr = (titleColorParsed.opacity !== undefined && titleColorParsed.opacity < 1)
                            ? ` fill-opacity="${titleColorParsed.opacity}"`
                            : '';
                        const fontSize = parseFloat(String(shapeData.titleFontSize)) || 14;
                        const titleLines = String(shapeData.title || '').split('\\n');
                        
                        const tx = w / 2;
                        const ty = 14;
                        
                        svg += `<text x="${tx}" y="${ty + 4}" text-anchor="middle" dominant-baseline="hanging" fill="${textColor}"${titleOpacityAttr} font-size="${fontSize}px" font-weight="bold">`;
                        titleLines.forEach((line, i) => {
                            const dy = i === 0 ? '0em' : '1.2em';
                            svg += `<tspan x="${tx}" dy="${dy}">${line}</tspan>`;
                        });
                        svg += `</text>`;
                    }
                    
                    if (node.children && node.children.length > 0) {
                        svg += generateNodesSvg(node.children, 0, 0); // recursive
                    }
                }
                
                if (shapeData.text && type !== 'flowchart-group') {
                    const textParsed = parseSvgColor(shapeData.textColor, '#f7eee2');
                    const textColor = textParsed.color === 'none' ? '#f7eee2' : textParsed.color;
                    const textOpacityAttr = (textParsed.opacity !== undefined && textParsed.opacity < 1)
                        ? ` fill-opacity="${textParsed.opacity}"`
                        : '';
                    const availableWidth = w - padding * 2;
                    const charsPerLine = Math.max(1, Math.floor(availableWidth / (13 * 0.6)));
                    const lines = wrapText(shapeData.text, charsPerLine);
                    const lineHeight = 1.2;
                    
                    svg += `<text x="${w/2}" y="${h/2}" text-anchor="middle" dominant-baseline="middle" fill="${textColor}"${textOpacityAttr} font-size="13px">`;
                    lines.forEach((line, i) => {
                        const dy = i === 0 ? `-${(lines.length - 1) * lineHeight / 2}em` : `${lineHeight}em`;
                        svg += `<tspan x="${w/2}" dy="${dy}">${line}</tspan>`;
                    });
                    svg += `</text>`;
                }
                
                svg += `</g>`;
            });
            return svg;
        };

        const collectAllEdges = (node: any, outEdges: any[], offsetX = 0, offsetY = 0) => {
            const absX = offsetX + (node.x || 0);
            const absY = offsetY + (node.y || 0);

            if (node.edges) {
                node.edges.forEach((e: any) => {
                    if (e.sections) {
                        e.sections.forEach((sec: any) => {
                            if (sec.startPoint) { sec.startPoint.x += absX; sec.startPoint.y += absY; }
                            if (sec.endPoint) { sec.endPoint.x += absX; sec.endPoint.y += absY; }
                            if (sec.bendPoints) {
                                sec.bendPoints.forEach((bp: any) => { bp.x += absX; bp.y += absY; });
                            }
                        });
                    }
                    if (e.labels) {
                        e.labels.forEach((label: any) => {
                            if (label.x !== undefined) label.x += absX;
                            if (label.y !== undefined) label.y += absY;
                        });
                    }
                    outEdges.push(e);
                });
            }
            if (node.children) {
                node.children.forEach((c: any) => collectAllEdges(c, outEdges, absX, absY));
            }
        };

        let allEdgesToDraw: any[] = [];
        if (layoutResult) {
            collectAllEdges(layoutResult, allEdgesToDraw, 0, 0);
            svgContent += generateEdgesSvg(allEdgesToDraw);
            svgContent += generateNodesSvg(layoutResult.children || [], 0, 0);
        }

        svgContent += `</svg>`;

        const result = {
            type: 'core:svg',
            content: svgContent
        };

        return { ...result, Render: result };
    }
}
