import type { InputDefinition, OutputDefinition } from '@tracereactive/types';

/**
 * Grows input ports dynamically based on connected edges.
 * Always exposes one more input slot than currently connected.
 */
export function dynamicFlowchartInputs(connections: any[]): InputDefinition[] {
    const inbound = (connections || []).filter(
        c => c.targetHandle && c.targetHandle.startsWith('Input ')
    );

    let maxIndex = 0;
    inbound.forEach(c => {
        const match = c.targetHandle.match(/Input (\d+)/);
        if (match) {
            const idx = parseInt(match[1], 10);
            if (idx > maxIndex) maxIndex = idx;
        }
    });

    const inputs: InputDefinition[] = [];
    for (let i = 1; i <= maxIndex + 1; i++) {
        inputs.push({ name: `Input ${i}`, acceptsType: 'flowchart' });
    }
    return inputs;
}

/**
 * Grows output ports dynamically based on connected edges.
 * Always exposes one more output slot than currently connected.
 */
export function dynamicFlowchartOutputs(connections: any[]): OutputDefinition[] {
    const outbound = (connections || []).filter(
        c => c.sourceHandle && c.sourceHandle.startsWith('Output ')
    );

    let maxIndex = 0;
    outbound.forEach(c => {
        const match = c.sourceHandle.match(/Output (\d+)/);
        if (match) {
            const idx = parseInt(match[1], 10);
            if (idx > maxIndex) maxIndex = idx;
        }
    });

    const outputs: OutputDefinition[] = [];
    for (let i = 1; i <= maxIndex + 1; i++) {
        outputs.push({ name: `Output ${i}`, outputType: 'flowchart' });
    }
    return outputs;
}
