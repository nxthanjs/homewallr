7        const lowerExisting = new Set(existingNames.map((n) => n.toLowerCase()))
        const newRoomsToInsert = rooms
          .filter((r) => !lowerExisting.has(r.name.toLowerCase()))
          .map((r) => ({
            user_id: userId,
            name: r.name,
            floor_level: 'Ground Floor',
            status: 'Planning',
            progress: 0,
            width_m: r.width_m || null,
            length_m: r.length_m || null,
          }))

        if (newRoomsToInsert.length > 0) {
          await supabase.from('rooms').insert(newRoomsToInsert)
        }
      }

      setLatestPlanUrl(image2D)
      setJobStatus('success')
    } catch (err: any) {
      console.error(err)
      alert('Floor plan generation error: ' + err.message)
      setJobStatus('error')
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    jobStatus,
    setJobStatus,
    jobResult,
    setJobResult,
    isGenerating,
    setIsGenerating,
    elapsedSeconds,
    setElapsedSeconds,
    stepText,
    setStepText,
    latestPlanUrl,
    setLatestPlanUrl,
    startGeneration,
  }
}