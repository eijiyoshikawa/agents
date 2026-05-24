import { getCompanyData } from "@/lib/data";
import ModernTemplate from "@/components/templates/ModernTemplate";
import ClassicTemplate from "@/components/templates/ClassicTemplate";
import PopTemplate from "@/components/templates/PopTemplate";

export default function Page() {
  const data = getCompanyData();

  switch (data.template) {
    case "classic":
      return <ClassicTemplate data={data} />;
    case "pop":
      return <PopTemplate data={data} />;
    case "modern":
    default:
      return <ModernTemplate data={data} />;
  }
}
