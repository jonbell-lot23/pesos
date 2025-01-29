import React from "react";

interface MetricsProps {
  totalPosts: number;
  timeSinceLastPost: number;
  averageTimeBetweenPosts: number;
  medianTimeBetweenPosts: number;
  averageLengthOfPosts: number;
}

const MetricsDisplay: React.FC<MetricsProps> = ({
  totalPosts,
  timeSinceLastPost,
  averageTimeBetweenPosts,
  medianTimeBetweenPosts,
  averageLengthOfPosts,
}) => {
  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} days`;
    if (hours > 0) return `${hours} hours`;
    if (minutes > 0) return `${minutes} minutes`;
    return `${seconds} seconds`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div className="p-4 bg-white shadow rounded">
        <div className="text-2xl font-bold">{totalPosts}</div>
        <div className="text-sm text-gray-500">Total Posts</div>
      </div>
      <div className="p-4 bg-white shadow rounded">
        <div className="text-2xl font-bold">
          {formatTime(timeSinceLastPost)}
        </div>
        <div className="text-sm text-gray-500">Time Since Last Post</div>
      </div>
      <div className="p-4 bg-white shadow rounded">
        <div className="text-2xl font-bold">
          {formatTime(averageTimeBetweenPosts)}
        </div>
        <div className="text-sm text-gray-500">Average Time Between Posts</div>
      </div>
      <div className="p-4 bg-white shadow rounded">
        <div className="text-2xl font-bold">
          {formatTime(medianTimeBetweenPosts)}
        </div>
        <div className="text-sm text-gray-500">Median Time Between Posts</div>
      </div>
      <div className="p-4 bg-white shadow rounded">
        <div className="text-2xl font-bold">
          {averageLengthOfPosts.toFixed(2)}
        </div>
        <div className="text-sm text-gray-500">Average Length of Posts</div>
      </div>
    </div>
  );
};

export default MetricsDisplay;
