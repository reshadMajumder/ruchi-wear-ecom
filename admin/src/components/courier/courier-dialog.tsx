"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_ENDPOINTS } from '@/lib/api-config';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Truck } from 'lucide-react';

interface City {
  city_id: string;
  city_name: string;
}

interface Zone {
  zone_id: string;
  zone_name: string;
}

interface Area {
  area_id: string;
  area_name: string;
}

interface CourierDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CourierDialog({ order, open, onOpenChange, onSuccess }: CourierDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);

  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  
  const [weight, setWeight] = useState<string>('0.5');
  const [instruction, setInstruction] = useState<string>('');

  useEffect(() => {
    if (open) {
      fetchCities();
    }
  }, [open]);

  const fetchCities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.COURIER_CITIES, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch cities');
      const data = await response.json();
      setCities(data);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async (cityId: string) => {
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.COURIER_ZONES(cityId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch zones');
      const data = await response.json();
      setZones(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const fetchAreas = async (zoneId: string) => {
    try {
      const token = localStorage.getItem('commercehub_access_token');
      const response = await fetch(API_ENDPOINTS.COURIER_AREAS(zoneId), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch areas');
      const data = await response.json();
      setAreas(data);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleCityChange = (val: string) => {
    setSelectedCity(val);
    setSelectedZone('');
    setSelectedArea('');
    setZones([]);
    setAreas([]);
    fetchZones(val);
  };

  const handleZoneChange = (val: string) => {
    setSelectedZone(val);
    setSelectedArea('');
    setAreas([]);
    fetchAreas(val);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem('commercehub_access_token');
      
      const body: any = {};
      if (selectedCity) body.recipient_city = selectedCity;
      if (selectedZone) body.recipient_zone = selectedZone;
      if (selectedArea) body.recipient_area = selectedArea;
      if (weight) body.item_weight = weight;
      if (instruction) body.special_instruction = instruction;

      const response = await fetch(API_ENDPOINTS.COURIER_CREATE_DELIVERY(order.order_id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create delivery');

      toast({
        title: 'Success',
        description: 'Courier delivery created successfully.'
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Add to Courier (Pathao)
          </DialogTitle>
          <DialogDescription>
            Configure delivery details for order {order.public_order_id}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="city" className="text-right font-bold text-slate-500">City <span className="text-[10px] block font-normal">(Optional)</span></Label>
            <div className="col-span-3">
              <Select onValueChange={handleCityChange} value={selectedCity}>
                <SelectTrigger id="city">
                  <SelectValue placeholder={loading ? "Loading..." : "Select City"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.city_id} value={city.city_id.toString()}>
                      {city.city_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="zone" className="text-right font-bold text-slate-500">Zone <span className="text-[10px] block font-normal">(Optional)</span></Label>
            <div className="col-span-3">
              <Select 
                onValueChange={handleZoneChange} 
                value={selectedZone} 
                disabled={!selectedCity || zones.length === 0}
              >
                <SelectTrigger id="zone">
                  <SelectValue placeholder={!selectedCity ? "Select City first" : zones.length === 0 ? "Loading..." : "Select Zone"} />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.zone_id} value={zone.zone_id.toString()}>
                      {zone.zone_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="area" className="text-right font-bold text-slate-500">Area <span className="text-[10px] block font-normal">(Optional)</span></Label>
            <div className="col-span-3">
              <Select 
                onValueChange={setSelectedArea} 
                value={selectedArea} 
                disabled={!selectedZone || areas.length === 0}
              >
                <SelectTrigger id="area">
                  <SelectValue placeholder={!selectedZone ? "Select Zone first" : areas.length === 0 ? "Loading..." : "Select Area"} />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem key={area.area_id} value={area.area_id.toString()}>
                      {area.area_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight" className="text-right font-bold text-slate-500">Weight <span className="text-[10px] block font-normal">(Optional)</span></Label>
            <Input
              id="weight"
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="instruction" className="text-right font-bold text-slate-500">Note <span className="text-[10px] block font-normal">(Optional)</span></Label>
            <Input
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Fragile, Handle with care, etc."
              className="col-span-3"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || loading}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Send to Pathao
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
