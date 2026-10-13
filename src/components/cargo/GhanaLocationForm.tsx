import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MapPin, Navigation, Plus, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useDeliveryLocations, useCreateDeliveryLocation, useDeleteDeliveryLocation, useUpdateDeliveryLocation } from "@/hooks/useDeliveryLocations";
import { useToast } from "@/hooks/use-toast";

const locationSchema = z.object({
  address: z.string().min(5, "Address is required").max(500),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  is_default: z.boolean().default(false),
});

type LocationFormData = z.infer<typeof locationSchema>;

export function GhanaLocationForm() {
  const [showForm, setShowForm] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const { locations, isLoading } = useDeliveryLocations();
  const createLocation = useCreateDeliveryLocation();
  const deleteLocation = useDeleteDeliveryLocation();
  const updateLocation = useUpdateDeliveryLocation();
  const { toast } = useToast();

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      address: "",
      latitude: undefined,
      longitude: undefined,
      is_default: false,
    },
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("latitude", position.coords.latitude);
        form.setValue("longitude", position.coords.longitude);
        toast({
          title: "Location captured",
          description: `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        toast({
          title: "Error",
          description: "Unable to get your location. Please enter manually.",
          variant: "destructive",
        });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const onSubmit = async (data: LocationFormData) => {
    const isFirst = locations.length === 0;
    await createLocation.mutateAsync({
      address: data.address,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      is_default: isFirst ? true : data.is_default,
    });
    form.reset();
    setShowForm(false);
  };

  const setAsDefault = async (id: string) => {
    // First, unset all defaults
    for (const loc of locations) {
      if (loc.is_default && loc.id !== id) {
        await updateLocation.mutateAsync({ id: loc.id, is_default: false });
      }
    }
    // Then set the new default
    await updateLocation.mutateAsync({ id, is_default: true });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Ghana Delivery Location
        </CardTitle>
        <CardDescription>
          Set your delivery location in Ghana for your shipments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing locations */}
        {locations.length > 0 && (
          <div className="space-y-3">
            {locations.map((location) => (
              <div
                key={location.id}
                className={`p-4 rounded-lg flex justify-between items-start ${
                  location.is_default ? "bg-primary/10 border border-primary" : "bg-muted"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{location.address}</h4>
                    {location.is_default && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  {location.latitude && location.longitude && (
                    <p className="text-xs text-muted-foreground mt-1">
                      📍 {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!location.is_default && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAsDefault(location.id)}
                      title="Set as default"
                    >
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteLocation.mutate(location.id)}
                    disabled={deleteLocation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new location form */}
        {showForm ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery Address</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Osu, Oxford Street, Accra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={isGettingLocation}
                  className="flex-1"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {isGettingLocation ? "Getting location..." : "Use My GPS Location"}
                </Button>
              </div>

              {form.watch("latitude") && form.watch("longitude") && (
                <div className="p-3 bg-muted rounded-lg text-sm">
                  <p className="text-muted-foreground">GPS Coordinates captured:</p>
                  <p className="font-mono text-xs">
                    Lat: {form.watch("latitude")?.toFixed(6)}, Lng: {form.watch("longitude")?.toFixed(6)}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={createLocation.isPending}>
                  {createLocation.isPending ? "Saving..." : "Save Location"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <Button onClick={() => setShowForm(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Delivery Location
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
