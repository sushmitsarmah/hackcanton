import type {
  CompletionRequest,
  CompletionResult,
  LlmDescriptor,
  StreamEvent,
} from './types.ts'

/**
 * The LLM port. Every provider adapter satisfies it, so the agent runtime never
 * depends on a vendor SDK or wire format.
 */
export interface LlmProvider {
  readonly key: LlmDescriptor['key']
  readonly descriptor: LlmDescriptor
  complete(request: CompletionRequest): Promise<CompletionResult>
  stream?(request: CompletionRequest): AsyncIterable<StreamEvent>
}
