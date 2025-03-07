import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./use-auth";
import { useQuery } from "@tanstack/react-query";
import { Channel } from "@shared/schema";

type SelectedChannelContextType = {
  selectedChannelId: number | undefined;
  setSelectedChannelId: (id: number | undefined) => void;
  selectedChannel: Channel | undefined;
};

// Use a storage key that's not tied to a specific user
// This allows the channel preference to persist across logins
const STORAGE_KEY = "lastSelectedChannelId";

export const SelectedChannelContext =
  createContext<SelectedChannelContextType | null>(null);

export function SelectedChannelProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState<
    number | undefined
  >(undefined);

  // Get user's channels
  const { data: userChannels } = useQuery<Channel[]>({
    queryKey: ["/api/channels"],
    select: (channels) => channels?.filter((c) => c.userId === user?.id) || [],
    enabled: !!user,
  });

  // Get the selected channel object
  const selectedChannel = userChannels?.find((c) => c.id === selectedChannelId);

  // Initialize from localStorage when component mounts or user changes
  useEffect(() => {
    const storedId = localStorage.getItem(STORAGE_KEY);

    if (storedId && user) {
      const parsedId = Number(storedId);
      // Only set if we have a valid numeric ID
      if (!isNaN(parsedId)) {
        console.log("Restoring selected channel from localStorage:", parsedId);
        setSelectedChannelId(parsedId);
      }
    }
  }, [user]);

  // When channels are loaded and there's no selected channel yet, default to first one
  useEffect(() => {
    if (userChannels?.length && selectedChannelId === undefined) {
      console.log(
        "Setting default channel to first available:",
        userChannels[0].id
      );
      setSelectedChannelId(userChannels[0].id);
    }
  }, [userChannels, selectedChannelId]);

  // When the user logs out, clear the selectedChannelId (but not localStorage)
  useEffect(() => {
    if (!user) {
      setSelectedChannelId(undefined);
    }
  }, [user]);

  // When selected channel changes, store it in localStorage
  const handleSetSelectedChannelId = (id: number | undefined) => {
    console.log("Setting selected channel ID:", id);
    setSelectedChannelId(id);

    if (id !== undefined) {
      localStorage.setItem(STORAGE_KEY, id.toString());
    }
  };

  // Log for debugging
  useEffect(() => {
    console.log("Selected channel context - ID:", selectedChannelId);
    console.log("Selected channel context - Channel:", selectedChannel);
  }, [selectedChannelId, selectedChannel]);

  return (
    <SelectedChannelContext.Provider
      value={{
        selectedChannelId,
        setSelectedChannelId: handleSetSelectedChannelId,
        selectedChannel,
      }}
    >
      {children}
    </SelectedChannelContext.Provider>
  );
}

export function useSelectedChannel() {
  const context = useContext(SelectedChannelContext);
  if (!context) {
    throw new Error(
      "useSelectedChannel must be used within a SelectedChannelProvider"
    );
  }
  return context;
}
