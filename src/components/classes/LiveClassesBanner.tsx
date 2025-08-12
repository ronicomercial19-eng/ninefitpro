import { useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface GymClass {
  id: string;
  class_datetime: string;
  class_name: string;
  location: string;
  instructor_name?: string;
}

export default function LiveClassesBanner() {
  const [classes, setClasses] = useState<GymClass[]>([]);

  useEffect(() => {
    const fetchUpcoming = async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("gym_classes")
        .select("id, class_datetime, class_name, location, instructor_name")
        .gte("class_datetime", now)
        .order("class_datetime", { ascending: true })
        .limit(8);
      setClasses(data || []);
    };
    fetchUpcoming();
  }, []);

  if (classes.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-4 text-center text-gray-400">
          Nenhuma aula ao vivo nos próximos dias.
        </CardContent>
      </Card>
    );
  }

  return (
    <Carousel plugins={[Autoplay({ delay: 3000 })]} className="w-full">
      <CarouselContent>
        {classes.map((c) => (
          <CarouselItem key={c.id} className="basis-full">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-400">
                      {format(new Date(c.class_datetime), "EEEE, dd 'de' MMMM • HH:mm", { locale: ptBR })}
                    </div>
                    <div className="text-xl font-bold text-white">{c.class_name}</div>
                    <div className="text-gray-400 text-sm">{c.location}{c.instructor_name ? ` • ${c.instructor_name}` : ''}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="border-gray-700 text-white" />
      <CarouselNext className="border-gray-700 text-white" />
    </Carousel>
  );
}
