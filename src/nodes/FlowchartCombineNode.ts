import { FlowchartShapeNode } from './FlowchartShapeNode';
import type { InputDefinition, OutputDefinition } from '@tracereactive/types';

export class FlowchartCombineNode extends FlowchartShapeNode {
    readonly typeId = 'flowchart-combine';
    readonly displayName = 'Combine Branches';
    readonly inputs: InputDefinition[] = [];
    readonly outputs: OutputDefinition[] = [
        { name: 'Combined', outputType: 'flowchart' }
    ];
    readonly dynamicInputs = { baseName: 'Branch', acceptsType: 'flowchart' };
    readonly dynamicOutputs = undefined;
    readonly properties = [];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const incoming: any[] = [];
        for (let i = 1; i <= 100; i++) {
            if (inputs[`Branch ${i}`]) {
                incoming.push(inputs[`Branch ${i}`]);
            }
        }

        const combineNode = {
            id: properties['_nodeId'] ? `combine_${properties['_nodeId']}` : crypto.randomUUID(),
            originalNodeId: properties['_nodeId'],
            type: 'flowchart-combine',
            isCombine: true,
            incoming: incoming
        };

        const result: Record<string, any> = { ...combineNode };
        result['Combined'] = combineNode;
        return result;
    }
}
