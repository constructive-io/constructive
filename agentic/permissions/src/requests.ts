/** Branching on what a classified request is: a bash call or a file tool call. */

import type { BashRequest, FileRequest, PermissionRequest } from './types';
import { unreachable } from './unreachable';

/** Runs `on.bash` or `on.file` for the request, so a new kind of request fails to compile here. */
export function byRequest<T>(request: PermissionRequest, on: { bash: (r: BashRequest) => T; file: (r: FileRequest) => T }): T {
  switch (request.toolName) {
  case 'bash':
    return on.bash(request);
  case 'read':
  case 'write':
  case 'edit':
  case 'grep':
  case 'find':
  case 'ls':
    return on.file(request);
  default:
    return unreachable(request);
  }
}
