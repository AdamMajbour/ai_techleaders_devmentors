import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@devmentor/ui";
import { PreviewInteractions } from "./PreviewInteractions";

export const metadata = {
  title: "UI preview",
  description: "Shared components from @devmentor/ui",
};

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const;

export default function UiPreviewPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">UI preview</h1>
      <Card>
        <CardHeader>
          <CardTitle>Button variants</CardTitle>
          <CardDescription>Components exported from @devmentor/ui.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </CardContent>
        <CardFooter className="gap-3">
          <Button size="sm">Small</Button>
          <Button>Default</Button>
          <Button size="lg">Large</Button>
        </CardFooter>
      </Card>
      <PreviewInteractions />
    </main>
  );
}
