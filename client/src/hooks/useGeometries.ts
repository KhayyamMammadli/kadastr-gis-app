import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getGeometries, saveGeometries } from "../services/geometryService";
import type { GeoJsonFeatureCollection } from "../types/gis";

export function useGeometries(enabled = true) {
  const queryClient = useQueryClient();

  const geometriesQuery = useQuery({
    queryKey: ["geometries"],
    queryFn: getGeometries,
    enabled,
    retry: 1
  });

  const saveMutation = useMutation({
    mutationFn: saveGeometries,
    onSuccess: (_data, variables: GeoJsonFeatureCollection) => {
      queryClient.setQueryData(["geometries"], variables);
    }
  });

  return {
    geometries: geometriesQuery.data,
    isLoadingGeometries: geometriesQuery.isLoading,
    refetchGeometries: geometriesQuery.refetch,
    saveGeometries: saveMutation.mutateAsync,
    isSavingGeometries: saveMutation.isPending
  };
}
