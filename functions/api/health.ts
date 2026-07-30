interface Env {
  ENVIRONMENT?: string
}

export const onRequestGet = async (context: { env: Env }): Promise<Response> => {
  return Response.json({
    ok: true,
    service: 'legacy-hotshot-command-center',
    environment: context.env.ENVIRONMENT ?? 'unknown',
    timestamp: new Date().toISOString(),
  })
}
