import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star } from "lucide-react";
import type { Tutor } from "@shared/schema";

interface TutorCardProps {
  tutor: Tutor;
  onBook: (tutorId: number) => void;
}

export default function TutorCard({ tutor, onBook }: TutorCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ));
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={tutor.avatar || ""} alt={tutor.name} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(tutor.name)}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{tutor.name}</h3>
            <p className="text-sm text-gray-600">{tutor.specialization}</p>
            
            <div className="flex items-center mt-2">
              <div className="flex">
                {renderStars(parseFloat(tutor.rating || "5"))}
              </div>
              <span className="text-sm text-gray-600 ml-2">
                {tutor.rating} ({tutor.reviewCount} reviews)
              </span>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="text-sm text-gray-600">
                <span className="font-medium">${tutor.hourlyRate}/hr</span>
              </div>
              <Button
                size="sm"
                onClick={() => onBook(tutor.id)}
                className="bg-primary hover:bg-primary/90"
              >
                Book Now
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
