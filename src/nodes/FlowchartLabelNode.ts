import type { InputDefinition, OutputDefinition } from '@tracereactive/types';
import { FlowchartShapeNode } from './FlowchartShapeNode';
import { dynamicFlowchartInputs, dynamicFlowchartOutputs } from './portHelpers';

export class FlowchartLabelNode extends FlowchartShapeNode {
    readonly typeId = 'flowchart-label';
    readonly displayName = 'Label';
    readonly inputs: InputDefinition[] = [];
    readonly outputs: OutputDefinition[] = [];
    readonly properties = [
        { name: 'text', label: 'Text', type: 'text' as const, defaultValue: '', isPrimary: true },
        { name: 'width', label: 'Width', type: 'number' as const, defaultValue: undefined, min: 0 },
        { name: 'height', label: 'Height', type: 'number' as const, defaultValue: undefined, min: 0 },
        { name: 'padding', label: 'Padding', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartLabelPadding' },
        { name: 'backgroundColor', label: 'Background', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartLabelBackground' },
        { name: 'textColor', label: 'Text color', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartLabelColor' },
        { name: 'borderColor', label: 'Border color', type: 'style' as const, styleType: 'color' as const, category: 'style' as const, defaultValue: 'theme:flowchartLabelBorder' },
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
        { name: 'borderWidth', label: 'Border width', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartLabelBorderWidth' },
        { name: 'borderRadius', label: 'Border radius', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartLabelBorderRadius' },
        { name: 'fontSize', label: 'Font size', type: 'style' as const, styleType: 'size' as const, category: 'style' as const, defaultValue: 'theme:flowchartLabelFontSize' }
    ];



    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const incoming = [];
        for (const key in inputs) {
            if ((key.startsWith('Input') || key.startsWith('In')) && inputs[key]) {
                incoming.push(inputs[key]);
            }
        }
        
        const sourceShape = incoming[0] || inputs['Input'] || inputs['Input 1'] || inputs['In'];

        const label = {
            id: crypto.randomUUID(),
            originalNodeId: properties['_nodeId'],
            isEdgeLabel: true,
            text: String(properties['text'] ?? ''),
            width: properties['width'],
            height: properties['height'],
            padding: properties['padding'] ?? 2,
            backgroundColor: properties['backgroundColor'] || '#2C2D2F',
            textColor: properties['textColor'] || '#f7eee2',
            borderColor: properties['borderColor'] || '#444444',
            borderStyle: properties['borderStyle'] || 'solid',
            borderWidth: properties['borderWidth'] ?? 1,
            borderRadius: properties['borderRadius'] ?? 4,
            fontSize: properties['fontSize'] ?? 11,
            sourceShape,
            incoming
        };
        
        const result: Record<string, any> = { ...label };
        const outputCount = 10;
        for (let i = 1; i <= outputCount; i++) {
            result[`Output ${i}`] = label;
        }
        return result;
    }
}
