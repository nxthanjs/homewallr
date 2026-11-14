import { NextRequest, NextResponse } from 'next/server'

const MODELS = ['gemini-3.8-flash', 'gemini-3.5-flash-lite']

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing GEMINI_API_KEY in .env.local.' },
        { status: 500 }
      )
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No floor plan image uploaded.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'image/jpeg'

    const svgPrompt = `You are a precision architectural CAD draftsman for HomeWallr. Trace the uploaded floor plan image into an exact, topologically faithful flat top-down 2D architectural blueprint SVG (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800">).

CRITICAL GEOMETRY, WALL & TEXT PLACEMENT RULES (WORKS FOR ANY HOUSE LAYOUT):
1. Single Closed Exterior Wall Path:
   - Draw the entire outer boundary of the building as ONE single continuous closed <path> (stroke="#3A3D38" stroke-width="11" stroke-linejoin="miter" fill="none").
   - Never draw duplicate parallel outer walls or floating detached wall blocks outside the building.
   - Keep collinear outer walls on the EXACT same X or Y coordinate (if rooms share a straight top edge or straight bottom edge in the original image, they MUST share the exact same Y coordinate—do not step rooms above or below a straight outer wall).
   - Draw chimney breasts as solid #3A3D38 rectangles attached to the INSIDE face of the wall, projecting inward into the room.
2. Snap All Interior Walls & Extensions:
   - Every interior dividing wall and attached extension (like a porch or outside store) must connect cleanly to the exact centerline of the exterior wall path with zero gaps or overhanging floor fills.
3. Zero Text-Over-Fixture Collisions:
   - NEVER place room titles or dimensions on top of staircases, kitchen hobs, sinks, or toilets.
   - Place each room's label in the open, unobstructed floor area of that room (for example, in a hallway with stairs at one end, place the "Hallway" label in the open floor space away from the stair treads; in a kitchen with a hob at the top edge, place the "Kitchen" label in the clear central floor space below the hob).
   - For small rooms/extensions (like WC, Porch, Store), place the label in a clean rounded white callout box (#FFFFFF stroke="#3A3D38" stroke-width="1") outside the perimeter connected by a thin dotted leader line.
4. Architectural Details & Watermark Removal:
   - Draw crisp staircase treads with a directional arrow, quarter-circle dashed door swing arcs at wall openings, inset double-glazed window breaks along exterior walls, and clean minimal outlines for hobs, sinks, and toilets.
   - COMPLETELY REMOVE all estate agent watermarks (e.g., "MONOPOLY", "BUY SELL RENT"), logos, and floor-level titles (e.g., "Ground Floor", "Building 1").

HOMEWALLR THEME & PALETTE:
- Canvas background: <rect width="1000" height="800" fill="#F5F3EE"/>
- Room floor fills (strictly clipped inside the wall centerlines, with subtle rounded corners rx="4"):
  - Primary living spaces: Soft Sage Green (#C8D3BE or #E7EAE3)
  - Hallways, kitchens, utility/dining spaces: Warm Taupe / Sand (#DFD3C3 or #EAE6DF)
- Typography: Clean sans-serif (font-family="system-ui, -apple-system, sans-serif") in dark charcoal (#2C2E2B) for room titles (font-size="14" font-weight="700") and metric dimensions underneath (font-size="11" fill="#57534E").

Output ONLY the raw <svg>...</svg> markup. Do not wrap in markdown code fences or JSON.`

    const roomsPrompt = `Analyze this floor plan image and extract all visible rooms with their exact names and metric dimensions (width_m, length_m). Return ONLY valid JSON:
{
  "rooms": [
    { "name": "Living Room", "width_m": 3.61, "length_m": 3.73 }
  ]
}`

    const errors: string[] = []
    let svgMarkup: string | null = null

    for (const model of MODELS) {
      try {
        const supportsThinking = model.includes('3.8')
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: svgPrompt },
                    { inline_data: { mime_type: mimeType, data: base64Data } },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.05,
                maxOutputTokens: 8192,
                ...(supportsThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              },
            }),
          }
        )

        const result = await response.json()

        if (response.ok) {
          let rawText: string = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
          rawText = rawText.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/i, '').trim()
          const svgMatch = rawText.match(/<svg[\s\S]*<\/svg>/i)
          if (svgMatch) {
            svgMarkup = svgMatch[0]
            break
          } else {
            const finishReason = result.candidates?.[0]?.finishReason || 'unknown'
            errors.push(`${model}: incomplete SVG (finishReason: ${finishReason})`)
          }
        } else {
          errors.push(`${model}: ${result.error?.message || response.statusText}`)
        }
      } catch (err: unknown) {
        errors.push(`${model}: ${err instanceof Error ? err.message : 'Network error'}`)
      }
    }

    if (!svgMarkup) {
      return NextResponse.json(
        { error: `SVG generation failed:\n${errors.join('\n')}` },
        { status: 500 }
      )
    }

    let rooms: Array<{ name: string; width_m?: number; length_m?: number }> = []
    for (const model of MODELS) {
      try {
        const supportsThinking = model.includes('3.8')
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: roomsPrompt },
                    { inline_data: { mime_type: mimeType, data: base64Data } },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                ...(supportsThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              },
            }),
          }
        )

        if (response.ok) {
          const result = await response.json()
          const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text
          if (rawText) {
            const parsed = JSON.parse(rawText)
            if (Array.isArray(parsed.rooms)) {
              rooms = parsed.rooms
              break
            }
          }
        }
      } catch {
        // Non-blocking: SVG already succeeded
      }
    }

    const image2D = `data:image/svg+xml;base64,${Buffer.from(svgMarkup).toString('base64')}`

    return NextResponse.json({
      image2D,
      rooms,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
// END OF FILE