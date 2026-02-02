import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useHomeSections } from "@/hooks/useHomeSections";
import { toast } from "sonner";
import { Loader2, LayoutGrid, Eye, EyeOff } from "lucide-react";

const AdminHomeSections = () => {
  const { sections, loading, updateVisibility } = useHomeSections();

  const handleToggle = async (sectionKey: string, currentValue: boolean) => {
    const success = await updateVisibility(sectionKey, !currentValue);
    if (success) {
      toast.success(`Section ${!currentValue ? 'shown' : 'hidden'} successfully`);
    } else {
      toast.error('Failed to update section visibility');
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
            Control which sections are visible on the home page
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Section Visibility</CardTitle>
            <CardDescription>
              Toggle sections on or off to customize the home page layout
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {section.is_visible ? (
                      <Eye className="h-5 w-5 text-primary" />
                    ) : (
                      <EyeOff className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <Label htmlFor={section.section_key} className="text-base font-medium cursor-pointer">
                        {section.section_name}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {section.section_key}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={section.section_key}
                    checked={section.is_visible}
                    onCheckedChange={() => handleToggle(section.section_key, section.is_visible)}
                  />
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
