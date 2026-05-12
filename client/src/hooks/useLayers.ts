import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLayers, saveLayers } from "../services/layerService";
import type { GeoJsonFeatureCollection } from "../types/gis";

export function useLayers(enabled = true) {
  const queryClient = useQueryClient();

  const layersQuery = useQuery({
    queryKey: ["layers"],
    queryFn: getLayers,
    enabled,
    retry: 1
  });

  const saveMutation = useMutation({
    mutationFn: saveLayers,
    onSuccess: (_data, variables: GeoJsonFeatureCollection) => {
      queryClient.setQueryData(["layers"], variables);
    }
  });

  return {
    layers: layersQuery.data,
    isLoadingLayers: layersQuery.isLoading,
    saveLayers: saveMutation.mutateAsync,
    isSavingLayers: saveMutation.isPending
  };
}
