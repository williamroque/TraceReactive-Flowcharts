import type { InputDefinition, OutputDefinition } from '@tracereactive/types';
import { FlowchartShapeNode } from './FlowchartShapeNode';

export class FlowchartGroupNode extends FlowchartShapeNode {
    readonly typeId = 'flowchart-group';
    readonly displayName = 'Group';
    readonly inputs: InputDefinition[] = [
        { name: 'Content', acceptsType: 'flowchart' },
        { name: 'Input', acceptsType: 'flowchart' }
    ];
    readonly outputs: OutputDefinition[] = [
        { name: 'Group', outputType: 'flowchart' }
    ];
    readonly dynamicInputs = undefined;
    readonly dynamicOutputs = undefined;
    readonly properties = [
        { 
            name: 'title', 
            label: 'Title', 
            type: 'text' as const, 
            defaultValue: '',
            isPrimary: true
        },
        { 
            name: 'titlePosition', 
            label: 'Title Position', 
            type: 'select' as const, 
            defaultValue: 'top-center',
            options: [
                { label: 'Top Left', value: 'top-left' },
                { label: 'Top Center', value: 'top-center' },
                { label: 'Top Right', value: 'top-right' },
                { label: 'Bottom Left', value: 'bottom-left' },
                { label: 'Bottom Center', value: 'bottom-center' },
                { label: 'Bottom Right', value: 'bottom-right' }
            ]
        },
        { 
            name: 'direction', 
            label: 'Layout Direction', 
            type: 'select' as const, 
            defaultValue: 'INHERIT',
            options: [
                { label: 'Inherit from Flowchart', value: 'INHERIT' },
                { label: 'Top to Bottom', value: 'DOWN' },
                { label: 'Left to Right', value: 'RIGHT' },
                { label: 'Bottom to Top', value: 'UP' },
                { label: 'Right to Left', value: 'LEFT' }
            ]
        },
        { name: 'padding', label: 'Padding', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartNodePadding' },
        { name: 'nodeSpacing', label: 'Node spacing', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupNodeSpacing' },
        { name: 'layerSpacing', label: 'Layer spacing', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupLayerSpacing' },
        
        { name: 'fillColor', label: 'Group background', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupBackground' },
        { name: 'borderColor', label: 'Group border', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupBorder' },
        { 
            name: 'borderStyle', 
            label: 'Group border style', 
            type: 'style' as const,
            styleType: 'select' as const,
            category: 'style' as const,
            defaultValue: 'theme:flowchartGroupBorderStyle',
            options: [
                { label: 'Theme Default', value: 'theme:flowchartGroupBorderStyle' },
                { label: 'Dashed', value: 'dashed' },
                { label: 'Dotted', value: 'dotted' },
                { label: 'Solid', value: 'solid' },
                { label: 'None', value: 'none' }
            ]
        },
        { name: 'borderWidth', label: 'Group border width', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupBorderWidth' },
        { name: 'borderRadius', label: 'Group border radius', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupBorderRadius' },
        { name: 'textColor', label: 'Group text color', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTextColor' },
        
        // Title styling
        { name: 'titleColor', label: 'Title color', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTitleColor' },
        { name: 'titleBackgroundColor', label: 'Title background', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTitleBackground' },
        { name: 'titleBorderColor', label: 'Title border', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTitleBorder' },
        { name: 'titleBorderWidth', label: 'Title border width', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTitleBorderWidth' },
        { name: 'titleBorderRadius', label: 'Title border radius', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTitleBorderRadius' },
        { name: 'titlePadding', label: 'Title padding', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTitlePadding' },
        { name: 'titleFontSize', label: 'Title font size', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartGroupTitleFontSize' },
        {
            name: 'entryPoint',
            label: 'Entry Point',
            type: 'select' as const,
            defaultValue: 'automatic',
            getOptions: (node: any, state: any, evaluator: any) => {
                const options = [{ label: 'Automatic', value: 'automatic' }];
                const edges = state.edges;
                const contentEdge = edges.find((e: any) => e.target === node.id && e.targetHandle === 'Content');
                if (contentEdge) {
                    const sourceOutput = evaluator.getOutput(contentEdge.source);
                    const contentNode = sourceOutput[contentEdge.sourceHandle];
                    if (contentNode) {
                        const visited = new Set<any>();
                        const queue = [contentNode];
                        const boundingGroupId = contentNode.groupId;
                        
                        while (queue.length > 0) {
                            const curr = queue.shift();
                            if (!curr || visited.has(curr)) continue;
                            visited.add(curr);
                            
                            if (curr.isEdgeLabel) {
                                const next = curr.sourceShape || (curr.incoming && curr.incoming[0]);
                                if (next) queue.push(next);
                                continue;
                            }
                            
                            if (curr.originalNodeId && curr.originalNodeId !== node.id) {
                                if (!options.some(opt => opt.value === curr.originalNodeId)) {
                                    let label = curr.type || 'Node';
                                    label = label.replace('flowchart-', '');
                                    label = label.charAt(0).toUpperCase() + label.slice(1);
                                    if (curr.text) {
                                        label += ` (${String(curr.text).substring(0, 15)}${String(curr.text).length > 15 ? '...' : ''})`;
                                    } else if (curr.title) {
                                        label += ` (${String(curr.title).substring(0, 15)}${String(curr.title).length > 15 ? '...' : ''})`;
                                    }
                                    options.push({ label, value: curr.originalNodeId });
                                }
                            }
                            
                            if (curr.incoming) {
                                for (const inc of curr.incoming) {
                                    if (!boundingGroupId || inc.groupId === boundingGroupId) {
                                        queue.push(inc);
                                    }
                                }
                            }
                        }
                    }
                }
                return options;
            }
        }
    ];



    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const contentNode = inputs['Content'];
        const inputNode = inputs['Input'];

        const groupId = crypto.randomUUID();

        const earliestNodes: any[] = [];
        const allNodesInGraph = new Set<any>();
        
        if (contentNode) {
            const visited = new Set<any>();
            const queue = [contentNode];

            while (queue.length > 0) {
                const curr = queue.shift();
                if (!curr || visited.has(curr)) continue;
                visited.add(curr);
                
                if (curr.isEdgeLabel) {
                    const next = curr.sourceShape || (curr.incoming && curr.incoming[0]);
                    if (next) queue.push(next);
                    continue;
                }

                allNodesInGraph.add(curr);
                curr.groupId = groupId;

                if (curr.incoming) {
                    for (const inc of curr.incoming) {
                        queue.push(inc);
                    }
                }
            }

            // Find roots
            for (const node of allNodesInGraph) {
                let hasIncoming = false;
                if (node.incoming) {
                    for (const inc of node.incoming) {
                        let actualInc = inc;
                        let edgeVisited = new Set<any>();
                        while (actualInc && actualInc.isEdgeLabel) {
                            if (edgeVisited.has(actualInc)) break;
                            edgeVisited.add(actualInc);
                            actualInc = actualInc.sourceShape || (actualInc.incoming && actualInc.incoming[0]);
                        }
                        if (actualInc && allNodesInGraph.has(actualInc)) {
                            hasIncoming = true;
                            break;
                        }
                    }
                }

                if (!hasIncoming) {
                    earliestNodes.push(node);
                }
            }
        }

        let targetNodes = earliestNodes;
        const entryPoint = properties['entryPoint'];
        if (entryPoint && entryPoint !== 'automatic') {
            const specificNodes = Array.from(allNodesInGraph).filter((n: any) => n.originalNodeId === entryPoint);
            if (specificNodes.length > 0) {
                targetNodes = specificNodes;
            }
        }

        // Attach input node to target nodes
        if (inputNode && targetNodes.length > 0) {
            for (const target of targetNodes) {
                if (!target.incoming) {
                    target.incoming = [];
                }
                
                // Clean up phantom inputs from previous evaluations
                target.incoming = target.incoming.filter((inc: any) => 
                    allNodesInGraph.has(inc) || inc === inputNode
                );

                // Avoid duplicates if evaluated multiple times
                if (!target.incoming.includes(inputNode)) {
                    target.incoming.push(inputNode);
                }
            }
        }

        const groupShape = {
            id: groupId,
            originalNodeId: properties['_nodeId'],
            type: 'flowchart-group',
            isGroup: true,
            title: properties['title'] !== undefined ? String(properties['title']) : '',
            titlePosition: properties['titlePosition'] || 'top-center',
            direction: properties['direction'] || 'INHERIT',
            fillColor: properties['fillColor'] || '#00000000',
            borderColor: properties['borderColor'] || '#c084fc',
            borderStyle: properties['borderStyle'] || 'dashed',
            borderWidth: properties['borderWidth'] ?? 2,
            borderRadius: properties['borderRadius'] ?? 8,
            textColor: properties['textColor'] || '#f7eee2',
            titleColor: properties['titleColor'] || '#f7eee2',
            titleBackgroundColor: properties['titleBackgroundColor'] || '#00000000',
            titleBorderColor: properties['titleBorderColor'] || '#00000000',
            titleBorderWidth: properties['titleBorderWidth'] ?? 0,
            titleBorderRadius: properties['titleBorderRadius'] ?? 4,
            titlePadding: properties['titlePadding'] ?? 4,
            titleFontSize: properties['titleFontSize'] !== undefined ? (parseFloat(String(properties['titleFontSize'])) || 14) : 14,
            padding: properties['padding'] ?? 10,
            nodeSpacing: properties['nodeSpacing'] ?? 15,
            layerSpacing: properties['layerSpacing'] ?? 20,
            contentNode,
            incoming: [],
            groupRoots: contentNode ? [contentNode] : (inputNode ? [inputNode] : [])
        };

        const result: Record<string, any> = { ...groupShape };
        result[`Group`] = groupShape;
        return result;
    }
}
