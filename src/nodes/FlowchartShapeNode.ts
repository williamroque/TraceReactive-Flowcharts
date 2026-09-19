import { BaseNode } from '@tracereactive/types';

export abstract class FlowchartShapeNode extends BaseNode {
    readonly category = 'Flowchart';
    readonly visible = true;
    readonly dynamicInputs = { baseName: 'Input', acceptsType: 'flowchart' };
    readonly dynamicOutputs = { baseName: 'Output', outputType: 'flowchart' };
}
