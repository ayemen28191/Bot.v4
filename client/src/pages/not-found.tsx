import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { t } from "@/lib/i18n";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">{t('page_not_found_404')}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
{t('page_not_found_description')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
