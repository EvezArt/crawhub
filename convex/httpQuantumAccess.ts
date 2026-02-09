import { internal } from './_generated/api'
import { httpAction } from './_generated/server'
import { requireApiTokenUser } from './lib/apiTokenAuth'

export const proveAccess = httpAction(async (ctx, request) => {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { userId, token, isQuantum } = await requireApiTokenUser(ctx, request)

    if (!isQuantum) {
      return new Response(
        JSON.stringify({
          error: 'Token must be a quantum access token',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const body = await request.json()
    const { capability, method, metadata } = body

    if (!capability || !method) {
      return new Response(
        JSON.stringify({
          error: 'capability and method are required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const proof = await ctx.runMutation(internal.quantumAccess.proveInlineAccessInternal, {
      userId,
      tokenId: token._id,
      capability,
      method,
      metadata,
    })

    return new Response(
      JSON.stringify({
        success: true,
        proof,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})

export const validateProof = httpAction(async (ctx, request) => {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const url = new URL(request.url)
    const proofId = url.searchParams.get('proofId')

    if (!proofId) {
      return new Response(
        JSON.stringify({
          error: 'proofId is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const proof = await ctx.runQuery(internal.quantumAccess.validateProofInternal, {
      proofId,
    })

    return new Response(JSON.stringify(proof), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
})
