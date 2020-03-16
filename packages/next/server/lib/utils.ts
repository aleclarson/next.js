export function printAndExit(message: string, code = 1) {
  if (code === 0) {
    // tslint:disable-next-line no-console
    console.log(message)
  } else {
    console.error(message)
  }

  process.exit(code)
}

const NODE_INSPECT_RE = /--inspect(-brk)?(=\S+)? ?/

export function isInspector() {
  return NODE_INSPECT_RE.test(process.env.NODE_OPTIONS!)
}

// Prevent --inspect/--inspect-brk from being inherited by child processes.
export function getNodeOptions() {
  return (process.env.NODE_OPTIONS || '').replace(NODE_INSPECT_RE, '')
}
