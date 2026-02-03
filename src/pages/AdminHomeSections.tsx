import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useHomeSections } from "@/hooks/useHomeSections";
import { toast } from "sonner";
import { Loader2, LayoutGrid, Monitor, Smartphone } from "lucide-react";

const AdminHomeSections = () => {
  const { sections, loading, updateWebVisibility, updateMobileVisibility } = useHomeSections();

  const handleWebToggle = async (sectionKey: string, currentValue: boolean) => {
    const success = await updateWebVisibility(sectionKey, !currentValue);
    if (success) {
      toast.success(`Web visibility ${!currentValue ? 'enabled' : 'disabled'}`);
    } else {
      toast.error('Failed to update web visibility');
    }
  };

  const handleMobileToggle = async (sectionKey: string, currentValue: boolean) => {
    const success = await updateMobileVisibility(sectionKey, !currentValue);
    if (success) {
      toast.success(`Mobile visibility ${!currentValue ? 'enabled' : 'disabled'}`);
    } else {
      toast.error('Failed to update mobile visibility');
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LayoutGrid className="h-8 w-8" />
            Home Page Sections
          </h1>
          <p className="text-muted-foreground mt-1">
            Control which sections are visible on web and mobile
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Section Visibility</CardTitle>
            <CardDescription>
              Toggle sections on or off for web and mobile separately
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Header Row */}
            <div className="flex items-center justify-between p-4 mb-2 rounded-lg bg-muted/50">
              <div className="flex-1">
                <span className="font-medium">Section Name</span>
              </div>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2 w-24 justify-center">
                  <Monitor className="h-4 w-4" />
                  <span className="text-sm font-medium">Web</span>
                </div>
                <div className="flex items-center gap-2 w-24 justify-center">
                  <Smartphone className="h-4 w-4" />
                  <span className="text-sm font-medium">Mobile</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <Label className="text-base font-medium">
                      {section.section_name}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {section.section_key}
                    </p>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="w-24 flex justify-center">
                      <Switch
                        checked={section.is_visible_web}
                        onCheckedChange={() => handleWebToggle(section.section_key, section.is_visible_web)}
                      />
                    </div>
                    <div className="w-24 flex justify-center">
                      <Switch
                        checked={section.is_visible_mobile}
                        onCheckedChange={() => handleMobileToggle(section.section_key, section.is_visible_mobile)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHomeSections;
