import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface FeedInputProps {
  value: string
  onChange: (value: string) => void
  onRemove: () => void
}

export default function FeedInput({ value, onChange, onRemove }: FeedInputProps) {
  return (
    <div className="flex items-center space-x-2 mb-4">
      <Input
        type="url"
        placeholder="Enter RSS feed URL"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-grow"
      />
      <Button variant="outline" size="icon" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}

