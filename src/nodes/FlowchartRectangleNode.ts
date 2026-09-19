import type { InputDefinition, OutputDefinition } from '@tracereactive/types';
import { FlowchartShapeNode } from './FlowchartShapeNode';
import { dynamicFlowchartInputs, dynamicFlowchartOutputs } from './portHelpers';

export class FlowchartRectangleNode extends FlowchartShapeNode {
    readonly typeId = 'flowchart-rectangle';
    readonly displayName = 'Rectangle';
    readonly inputs: InputDefinition[] = [];
    readonly outputs: OutputDefinition[] = [];
    readonly properties = [
        { name: 'text', label: 'Text', type: 'text' as const, defaultValue: '', isPrimary: true },
        { name: 'width', label: 'Width', type: 'number' as const, defaultValue: undefined, min: 0 },
        { name: 'height', label: 'Height', type: 'number' as const, defaultValue: undefined, min: 0 },
        { name: 'padding', label: 'Padding', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartNodePadding' },
        { name: 'fillColor', label: 'Fill', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartRectangleBackground' },
        { name: 'borderColor', label: 'Border', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartRectangleBorder' },
        { 
            name: 'borderStyle', 
            label: 'Border style', 
            type: 'style' as const,
            styleType: 'select' as const,
            category: 'style' as const,
            defaultValue: 'solid',
            options: [
                { label: 'Solid', value: 'solid' },
                { label: 'Dashed', value: 'dashed' },
                { label: 'Dotted', value: 'dotted' },
                { label: 'None', value: 'none' }
            ]
        },
        { name: 'textColor', label: 'Text color', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartRectangleTextColor' },
        { name: 'borderWidth', label: 'Border width', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartBorderWidth' },
        { name: 'borderRadius', label: 'Border radius', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartRectangleBorderRadius' }
    ];



    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const incoming = [];
        for (const key in inputs) {
            if (key.startsWith('Input ') && inputs[key]) {
                incoming.push(inputs[key]);
            }
        }
        const shape = {
            id: crypto.randomUUID(),
            originalNodeId: properties['_nodeId'],
            type: 'flowchart-rectangle',
            text: String(properties['text'] ?? ''),
            width: properties['width'],
            height: properties['height'],
            padding: properties['padding'] ?? 10,
            fillColor: properties['fillColor'] || '#1D1E1F',
            borderColor: properties['borderColor'] || '#c084fc',
            borderStyle: properties['borderStyle'] || 'solid',
            textColor: properties['textColor'] || '#f7eee2',
            borderWidth: properties['borderWidth'] ?? 2,
            borderRadius: properties['borderRadius'] ?? 8,
            incoming
        };
        const result: Record<string, any> = { ...shape };
        const outputCount = 10;
        for (let i = 1; i <= outputCount; i++) {
            result[`Output ${i}`] = shape;
        }
        return result;
    }
}
