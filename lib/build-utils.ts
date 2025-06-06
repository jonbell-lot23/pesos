export function isBuildTime() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function handleBuildTimeResponse() {
  if (isBuildTime()) {
    return {
      status: 200,
      body: { data: [] },
    };
  }
  return null;
}
