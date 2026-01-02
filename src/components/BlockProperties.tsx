import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FlowBlock } from "@/stores/callFlowStore";
import { Settings, Plus, X, Link } from "lucide-react";
import { MessageCircle } from "lucide-react";
import AudioRecorder from "@/components/AudioRecorder";

interface BlockPropertiesProps {
  block: FlowBlock | null;
  allBlocks: FlowBlock[];
  onUpdateBlock: (id: string, updates: Partial<FlowBlock>) => void;
  onConnect: (fromId: string, toId: string) => void;
  onDisconnect: (fromId: string, toId: string) => void;
  onStartConnecting: (id: string) => void;
}

const BLOCK_LABELS = {
  say: "Say Text",
  gather: "Menu/Gather",
  forward: "Forward Call",
  multi_forward: "Multi Forward",
  pause: "Pause/Wait",
  play: "Play Audio",
  hangup: "End Call",
  sms: "Send SMS",
};

export default function BlockProperties({
  block,
  allBlocks,
  onUpdateBlock,
  onConnect,
  onDisconnect,
  onStartConnecting,
}: BlockPropertiesProps) {
  if (!block) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Select a Block
          </h3>
          <p className="text-sm text-gray-600">
            Click on a block in the canvas to edit its properties and configure
            its behavior
          </p>
        </CardContent>
      </Card>
    );
  }

  const updateConfig = (updates: any) => {
    onUpdateBlock(block.id, {
      config: { ...block.config, ...updates },
    });
  };

  const addMenuOption = () => {
    const currentOptions = block.config.options || [];
    updateConfig({
      options: [
        ...currentOptions,
        { digit: "", text: "", action: "say", blockId: "" },
      ],
    });
  };

  const updateMenuOption = (index: number, updates: any) => {
    const currentOptions = [...(block.config.options || [])];
    currentOptions[index] = { ...currentOptions[index], ...updates };
    updateConfig({ options: currentOptions });
  };

  const removeMenuOption = (index: number) => {
    const currentOptions = [...(block.config.options || [])];
    currentOptions.splice(index, 1);
    updateConfig({ options: currentOptions });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          {BLOCK_LABELS[block.type]} Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Management */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Connections</Label>
          <div className="text-sm text-gray-600 mb-2 p-2 bg-blue-50 rounded border">
            This block connects to {block.connections.length} other block
            {block.connections.length !== 1 ? "s" : ""}
          </div>
          {block.connections.map((connId) => {
            const connectedBlock = allBlocks.find((b) => b.id === connId);
            return connectedBlock ? (
              <div
                key={connId}
                className="flex items-center justify-between p-2 bg-gray-50 rounded border"
              >
                <Badge variant="outline" className="text-xs">
                  {BLOCK_LABELS[connectedBlock.type]}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDisconnect(block.id, connId)}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : null;
          })}
          <Button
            size="sm"
            variant="outline"
            onClick={() => onStartConnecting(block.id)}
            className="w-full h-8 text-sm"
          >
            <Link className="h-4 w-4 mr-1" />
            Connect to Another Block
          </Button>
        </div>

        {/* Block-specific configuration */}
        {block.type === "say" && (
          <div className="space-y-3">
            <AudioRecorder
              label="Message Audio Recording"
              currentAudioUrl={block.config.audioUrl || block.config.audio_url}
              onRecordingComplete={(url) => updateConfig({ audioUrl: url })}
            />
            <div className="space-y-2">
              <Label className="text-sm">Message Text (Fallback)</Label>
              <Textarea
                value={block.config.text || ""}
                onChange={(e) => updateConfig({ text: e.target.value })}
                placeholder="Enter the message to speak (only used if no audio recording provided)..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                This text will only be used if no audio recording is provided.
              </p>
            </div>
          </div>
        )}

        {block.type === "gather" && (
          <div className="space-y-3">
            <AudioRecorder
              label="Menu Prompt Audio Recording"
              currentAudioUrl={block.config.promptAudioUrl || block.config.prompt_audio_url}
              onRecordingComplete={(url) => updateConfig({ promptAudioUrl: url })}
            />
            <div className="space-y-2">
              <Label className="text-sm">Menu Prompt Text (Fallback)</Label>
              <Textarea
                value={block.config.prompt || ""}
                onChange={(e) => updateConfig({ prompt: e.target.value })}
                placeholder="Enter the menu prompt (only used if no audio recording provided)..."
                rows={3}
                className="text-sm"
              />
              <p className="text-xs text-gray-500">
                This text will only be used if no audio recording is provided.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Retry Settings</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-600">Max Retries</Label>
                  <Input
                    type="number"
                    value={block.config.maxRetries || 3}
                    onChange={(e) =>
                      updateConfig({ maxRetries: parseInt(e.target.value) })
                    }
                    min="1"
                    max="10"
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div>
                <AudioRecorder
                  label="Retry Message Audio"
                  currentAudioUrl={block.config.retryAudioUrl || block.config.retry_audio_url}
                  onRecordingComplete={(url) => updateConfig({ retryAudioUrl: url })}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Retry Message Text (Fallback)</Label>
                <Textarea
                  value={block.config.retryMessage || ""}
                  onChange={(e) =>
                    updateConfig({ retryMessage: e.target.value })
                  }
                  placeholder="Sorry, I didn't understand. Please try again."
                  className="text-sm"
                  rows={2}
                />
              </div>
              <div>
                <AudioRecorder
                  label="Goodbye Message Audio"
                  currentAudioUrl={block.config.goodbyeAudioUrl || block.config.goodbye_audio_url}
                  onRecordingComplete={(url) => updateConfig({ goodbyeAudioUrl: url })}
                />
              </div>
              <div>
                <Label className="text-xs text-gray-600">Goodbye Message Text (Fallback)</Label>
                <Textarea
                  value={block.config.goodbyeMessage || ""}
                  onChange={(e) =>
                    updateConfig({ goodbyeMessage: e.target.value })
                  }
                  placeholder="Thank you for calling. Goodbye!"
                  className="text-sm"
                  rows={2}
                />
              </div>
              <div className="text-xs text-gray-500 p-2 bg-blue-50 rounded border">
                💡 The system will retry up to {block.config.maxRetries || 3}{" "}
                times before playing the goodbye message and hanging up.
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Menu Options</Label>
              {(block.config.options || []).map(
                (option: any, index: number) => (
                  <div
                    key={index}
                    className="space-y-2 p-3 bg-gray-50 rounded border"
                  >
                    <div className="flex gap-2 items-center">
                      <Input
                        value={option.digit}
                        onChange={(e) =>
                          updateMenuOption(index, { digit: e.target.value })
                        }
                        placeholder="Key"
                        className="w-12 h-8 text-sm text-center"
                      />
                      <Input
                        value={option.text}
                        onChange={(e) =>
                          updateMenuOption(index, { text: e.target.value })
                        }
                        placeholder="Option description"
                        className="flex-1 h-8 text-sm"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeMenuOption(index)}
                        className="h-8 w-8 p-0 text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <AudioRecorder
                        label="Response Audio (Optional)"
                        currentAudioUrl={option.audioUrl || option.audio_url}
                        onRecordingComplete={(url) =>
                          updateMenuOption(index, { audioUrl: url })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-gray-600">
                        Connect to Block
                      </Label>
                      <Select
                        value={option.blockId || "none"}
                        onValueChange={(value) =>
                          updateMenuOption(index, {
                            blockId: value === "none" ? "" : value,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Select block to connect to" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No connection</SelectItem>
                          {allBlocks
                            .filter((b) => b.id !== block.id)
                            .map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {BLOCK_LABELS[b.type]} -{" "}
                                {b.config.text?.substring(0, 30) ||
                                  b.config.prompt?.substring(0, 30) ||
                                  b.config.number ||
                                  "Block"}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {option.blockId && (
                        <Badge variant="outline" className="text-xs">
                          Connected to:{" "}
                          {BLOCK_LABELS[
                            allBlocks.find((b) => b.id === option.blockId)?.type
                          ] || "Unknown"}
                        </Badge>
                      )}
                    </div>
                  </div>
                ),
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={addMenuOption}
                className="w-full h-8 text-sm border-dashed"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Option
              </Button>
            </div>
          </div>
        )}

        {block.type === "forward" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input
                value={block.config.number || ""}
                onChange={(e) => updateConfig({ number: e.target.value })}
                placeholder="+1234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>Timeout (seconds)</Label>
              <Input
                type="number"
                value={block.config.timeout || 30}
                onChange={(e) =>
                  updateConfig({ timeout: parseInt(e.target.value) })
                }
                min="5"
                max="300"
              />
            </div>
          </div>
        )}

        {block.type === "pause" && (
          <div className="space-y-2">
            <Label>Duration (seconds)</Label>
            <Input
              type="number"
              value={block.config.duration || 2}
              onChange={(e) =>
                updateConfig({ duration: parseInt(e.target.value) })
              }
              min="1"
              max="10"
            />
          </div>
        )}

        {block.type === "play" && (
          <div className="space-y-2">
            <Label>Audio URL</Label>
            <Input
              value={block.config.url || ""}
              onChange={(e) => updateConfig({ url: e.target.value })}
              placeholder="https://example.com/audio.mp3"
            />
          </div>
        )}

        {block.type === "multi_forward" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Forward Strategy</Label>
              <Select
                value={block.config.forwardStrategy || "simultaneous"}
                onValueChange={(value) =>
                  updateConfig({ forwardStrategy: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select forwarding strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simultaneous">
                    Simultaneous (Ring all at once)
                  </SelectItem>
                  <SelectItem value="sequential">
                    Sequential (Try one by one)
                  </SelectItem>
                  <SelectItem value="priority">
                    Priority (Primary first, then others)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ring Timeout (seconds)</Label>
              <Input
                type="number"
                value={block.config.ringTimeout || 20}
                onChange={(e) =>
                  updateConfig({ ringTimeout: parseInt(e.target.value) })
                }
                min="5"
                max="60"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Numbers (up to 10)</Label>
              {(block.config.numbers || []).map(
                (number: string, index: number) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input
                      value={number}
                      onChange={(e) => {
                        const newNumbers = [...(block.config.numbers || [])];
                        newNumbers[index] = e.target.value;
                        updateConfig({ numbers: newNumbers });
                      }}
                      placeholder="+1234567890"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const newNumbers = [...(block.config.numbers || [])];
                        newNumbers.splice(index, 1);
                        updateConfig({ numbers: newNumbers });
                      }}
                      className="h-8 w-8 p-0 text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ),
              )}
              {(block.config.numbers || []).length < 10 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const currentNumbers = block.config.numbers || [];
                    updateConfig({ numbers: [...currentNumbers, ""] });
                  }}
                  className="w-full h-8 text-sm border-dashed"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Phone Number
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
