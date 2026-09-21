import { FlowchartShapeNode } from './nodes/FlowchartShapeNode';
import { FlowchartOvalNode } from './nodes/FlowchartOvalNode';
import { FlowchartParallelogramNode } from './nodes/FlowchartParallelogramNode';
import { FlowchartDiamondNode } from './nodes/FlowchartDiamondNode';
import { FlowchartRectangleNode } from './nodes/FlowchartRectangleNode';
import { FlowchartLabelNode } from './nodes/FlowchartLabelNode';
import { FlowchartGroupNode } from './nodes/FlowchartGroupNode';
import { FlowchartRenderNode } from './nodes/FlowchartRenderNode';

// The traceReactive API is exposed via preload in the sandbox
declare const traceReactive: {
    registerNodes: (nodes: any[]) => void;
    registerPreviewers: (previewers: any[]) => void;
    registerExporters: (exporters: any[]) => void;
    registerThemeSections: (sections: any[]) => void;
    onEvaluateNode: (callback: (args: { typeId: string; inputs: any; properties: any; evaluationId: string }) => void) => void;
    resolveEvaluation: (args: { evaluationId: string; result?: any; error?: string }) => void;
};

// 1. Instantiate the nodes
const nodes = [
    new FlowchartOvalNode(),
    new FlowchartParallelogramNode(),
    new FlowchartDiamondNode(),
    new FlowchartRectangleNode(),
    new FlowchartLabelNode(),
    new FlowchartGroupNode(),
    new FlowchartRenderNode()
];

// 2. Register with the host app
const serializableNodes = nodes.map(n => ({
    typeId: n.typeId,
    displayName: n.displayName,
    category: n.category,
    nodeInterface: n.nodeInterface,
    visible: n.visible,
    inputs: n.inputs,
    outputs: n.outputs,
    properties: n.properties,
    dynamicInputs: n.dynamicInputs,
    dynamicOutputs: n.dynamicOutputs
}));
traceReactive.registerNodes(serializableNodes);

traceReactive.registerThemeSections([
    {
        name: 'Flowchart: General',
        variables: [
            { key: 'flowchartBackgroundColor', label: 'Background color', type: 'color', defaultValue: '#00000000', section: 'Flowchart: General' },
            { key: 'flowchartEdgeColor', label: 'Edge color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: General' },
            { key: 'flowchartBorderWidth', label: 'Border width', type: 'number', defaultValue: '2', section: 'Flowchart: General' },
            { key: 'flowchartNodePadding', label: 'Node padding', type: 'number', defaultValue: '10', section: 'Flowchart: General' }
        ]
    },
    {
        name: 'Flowchart: Shapes',
        variables: [
            { key: 'flowchartOvalBackground', label: 'Oval background', type: 'color', defaultValue: '#1D1E1F', section: 'Flowchart: Shapes' },
            { key: 'flowchartOvalBorder', label: 'Oval border', type: 'color', defaultValue: '#77E4FF', section: 'Flowchart: Shapes' },
            { key: 'flowchartOvalTextColor', label: 'Oval text color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: Shapes' },
            { key: 'flowchartParallelogramBackground', label: 'Parallelogram background', type: 'color', defaultValue: '#1D1E1F', section: 'Flowchart: Shapes' },
            { key: 'flowchartParallelogramBorder', label: 'Parallelogram border', type: 'color', defaultValue: '#3693AB', section: 'Flowchart: Shapes' },
            { key: 'flowchartParallelogramTextColor', label: 'Parallelogram text color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: Shapes' },
            { key: 'flowchartDiamondBackground', label: 'Diamond background', type: 'color', defaultValue: '#1D1E1F', section: 'Flowchart: Shapes' },
            { key: 'flowchartDiamondBorder', label: 'Diamond border', type: 'color', defaultValue: '#fbbf24', section: 'Flowchart: Shapes' },
            { key: 'flowchartDiamondTextColor', label: 'Diamond text color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: Shapes' },
            { key: 'flowchartRectangleBackground', label: 'Rectangle background', type: 'color', defaultValue: '#1D1E1F', section: 'Flowchart: Shapes' },
            { key: 'flowchartRectangleBorder', label: 'Rectangle border', type: 'color', defaultValue: '#c084fc', section: 'Flowchart: Shapes' },
            { key: 'flowchartRectangleTextColor', label: 'Rectangle text color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: Shapes' },
            { key: 'flowchartRectangleBorderRadius', label: 'Rectangle border radius', type: 'number', defaultValue: '8', section: 'Flowchart: Shapes' }
        ]
    },
    {
        name: 'Flowchart: Labels',
        variables: [
            { key: 'flowchartLabelBackground', label: 'Label background', type: 'color', defaultValue: '#2C2D2F', section: 'Flowchart: Labels' },
            { key: 'flowchartLabelColor', label: 'Label color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: Labels' },
            { key: 'flowchartLabelBorder', label: 'Label border', type: 'color', defaultValue: '#444444', section: 'Flowchart: Labels' },
            { key: 'flowchartLabelBorderWidth', label: 'Label border width', type: 'number', defaultValue: '1', section: 'Flowchart: Labels' },
            { key: 'flowchartLabelBorderRadius', label: 'Label border radius', type: 'number', defaultValue: '4', section: 'Flowchart: Labels' },
            { key: 'flowchartLabelFontSize', label: 'Label font size', type: 'number', defaultValue: '11', section: 'Flowchart: Labels' },
            { key: 'flowchartLabelPadding', label: 'Label padding', type: 'number', defaultValue: '2', section: 'Flowchart: Labels' }
        ]
    },
    {
        name: 'Flowchart: Groups',
        variables: [
            { key: 'flowchartGroupBackground', label: 'Group background', type: 'color', defaultValue: '#00000000', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupBorder', label: 'Group border', type: 'color', defaultValue: '#c084fc', section: 'Flowchart: Groups' },
            { 
                key: 'flowchartGroupBorderStyle', 
                label: 'Group border style', 
                type: 'select',
                options: [
                    { label: 'Dashed', value: 'dashed' },
                    { label: 'Dotted', value: 'dotted' },
                    { label: 'Solid', value: 'solid' },
                    { label: 'None', value: 'none' }
                ],
                defaultValue: 'dashed',
                section: 'Flowchart: Groups'
            },
            { key: 'flowchartGroupBorderWidth', label: 'Group border width', type: 'number', defaultValue: '2', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupBorderRadius', label: 'Group border radius', type: 'number', defaultValue: '8', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTextColor', label: 'Group text color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTitleColor', label: 'Title color', type: 'color', defaultValue: '#f7eee2', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTitleBackground', label: 'Title background', type: 'color', defaultValue: '#00000000', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTitleBorder', label: 'Title border', type: 'color', defaultValue: '#00000000', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTitleBorderWidth', label: 'Title border width', type: 'number', defaultValue: '0', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTitleBorderRadius', label: 'Title border radius', type: 'number', defaultValue: '4', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTitlePadding', label: 'Title padding', type: 'number', defaultValue: '4', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupTitleFontSize', label: 'Title font size', type: 'number', defaultValue: '14', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupNodeSpacing', label: 'Group node spacing', type: 'number', defaultValue: '15', section: 'Flowchart: Groups' },
            { key: 'flowchartGroupLayerSpacing', label: 'Group layer spacing', type: 'number', defaultValue: '20', section: 'Flowchart: Groups' }
        ]
    }
]);

// 3. Listen for evaluation requests
traceReactive.onEvaluateNode(async ({ typeId, inputs, properties }) => {
    const node = nodes.find(n => n.typeId === typeId);
    if (!node) {
        throw new Error(`Unknown node type: ${typeId}`);
    }
    return await node.evaluate(inputs, properties);
});
