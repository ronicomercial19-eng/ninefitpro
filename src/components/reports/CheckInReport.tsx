import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, CheckCircle, XCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CheckInRecord {
  id: string;
  user_email: string;
  status: string;
  check_in_at: string | null;
  booking_time: string | null;
  class_name: string;
  class_datetime: string;
  location: string;
}

export function CheckInReport() {
  const [records, setRecords] = useState<CheckInRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchCheckIns();
  }, []);

  const fetchCheckIns = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("class_bookings")
      .select("id, user_email, status, check_in_at, booking_time, gym_classes(class_name, class_datetime, location)")
      .order("booking_time", { ascending: false })
      .limit(200);

    if (data) {
      setRecords(
        data.map((d: any) => ({
          id: d.id,
          user_email: d.user_email,
          status: d.status,
          check_in_at: d.check_in_at,
          booking_time: d.booking_time,
          class_name: d.gym_classes?.class_name || "—",
          class_datetime: d.gym_classes?.class_datetime || "",
          location: d.gym_classes?.location || "",
        }))
      );
    }
    if (error) console.error("Error fetching check-ins:", error);
    setLoading(false);
  };

  const filtered = records.filter(
    (r) =>
      r.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.class_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalCheckIns = records.filter((r) => r.check_in_at).length;
  const totalConfirmed = records.filter((r) => r.status === "confirmed").length;
  const attendanceRate = totalConfirmed > 0 ? Math.round((totalCheckIns / totalConfirmed) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{totalConfirmed}</p>
            <p className="text-xs text-muted-foreground">Reservas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-green-500">{totalCheckIns}</p>
            <p className="text-xs text-muted-foreground">Check-ins</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-primary">{attendanceRate}%</p>
            <p className="text-xs text-muted-foreground">Presença</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por email ou aula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Aula</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check-in</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.user_email}</TableCell>
                      <TableCell>{r.class_name}</TableCell>
                      <TableCell>
                        {r.class_datetime
                          ? format(new Date(r.class_datetime), "dd/MM/yy HH:mm", { locale: ptBR })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>
                          {r.status === "confirmed" ? "Confirmado" : r.status === "cancelled" ? "Cancelado" : r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.check_in_at ? (
                          <span className="flex items-center gap-1 text-green-500 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            {format(new Date(r.check_in_at), "HH:mm")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-sm">
                            <XCircle className="w-4 h-4" />
                            Ausente
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
