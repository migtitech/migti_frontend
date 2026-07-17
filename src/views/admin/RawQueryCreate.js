import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Input,
  Textarea,
  Label,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import rawQueryService from "../../services/rawQueryService";
import industryService from "../../services/industryService";
import areaService from "../../services/areaService";
import { toastSuccess, toastError } from "../../utils/toast";

const INITIAL_INDUSTRY_EDIT = {
  name: "",
  area: "",
  location: "",
  address: "",
  purchase_manager_name: "",
  purchase_manager_phone: "",
  email: "",
};

const RawQueryCreate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    priority: "medium",
    description: "",
  });
  const [industrySearch, setIndustrySearch] = useState("");
  const [industryDropdownOpen, setIndustryDropdownOpen] = useState(false);
  const [industrySearchResults, setIndustrySearchResults] = useState([]);
  const [industrySearchLoading, setIndustrySearchLoading] = useState(false);
  const [industryId, setIndustryId] = useState("");
  const [createNewIndustry, setCreateNewIndustry] = useState(false);
  const [industryDetails, setIndustryDetails] = useState(null);
  const [industryEditForm, setIndustryEditForm] = useState(
    INITIAL_INDUSTRY_EDIT,
  );
  const [areas, setAreas] = useState([]);
  const [savingIndustry, setSavingIndustry] = useState(false);
  const [creatingIndustry, setCreatingIndustry] = useState(false);
  const dropdownRef = useRef(null);
  const [audioClips, setAudioClips] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioError, setAudioError] = useState("");
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingStartRef = useRef(null);
  const timerRef = useRef(null);
  const audioClipsRef = useRef([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [descriptionError, setDescriptionError] = useState("");
  const [descriptionTouched, setDescriptionTouched] = useState(false);

  useEffect(() => {
    audioClipsRef.current = audioClips;
  }, [audioClips]);

  const fetchIndustrySearch = useCallback(async (term) => {
    setIndustrySearchLoading(true);
    try {
      const params =
        term.trim().length > 0
          ? { search: term.trim(), pageSize: 20 }
          : { pageSize: 100 };
      const response = await industryService.getAll(params);
      const payload = response?.data || response;
      const list = payload?.industries ?? payload?.data?.industries ?? [];
      setIndustrySearchResults(list);
    } catch {
      setIndustrySearchResults([]);
    } finally {
      setIndustrySearchLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await areaService.getAll({ pageSize: 100 });
        const data = res?.data || res;
        setAreas(data?.areas || []);
      } catch {
        setAreas([]);
      }
    };
    fetchAreas();
  }, []);

  useEffect(() => {
    fetchIndustrySearch("");
  }, [fetchIndustrySearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchIndustrySearch(industrySearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [industrySearch, fetchIndustrySearch]);

  const handleSelectIndustry = async (industry) => {
    setIndustryId(industry._id || industry.id);
    setIndustrySearch(
      (industry.name || "") +
        (industry.location ? ` (${industry.location})` : ""),
    );
    setIndustryDropdownOpen(false);
    setCreateNewIndustry(false);
    try {
      const res = await industryService.getById(industry._id || industry.id);
      const data = res?.data || res;
      setIndustryDetails(data);
      setIndustryEditForm({
        name: data?.name || "",
        area:
          typeof data?.area === "object"
            ? data?.area?._id || ""
            : data?.area || "",
        location: data?.location || "",
        address: data?.address || "",
        purchase_manager_name: data?.purchase_manager_name || "",
        purchase_manager_phone: data?.purchase_manager_phone || "",
        email: data?.email || "",
      });
    } catch {
      setIndustryDetails(industry);
      setIndustryEditForm({
        name: industry?.name || "",
        area:
          typeof industry?.area === "object"
            ? industry?.area?._id || ""
            : industry?.area || "",
        location: industry?.location || "",
        address: industry?.address || "",
        purchase_manager_name: industry?.purchase_manager_name || "",
        purchase_manager_phone: industry?.purchase_manager_phone || "",
        email: industry?.email || "",
      });
    }
  };

  const handleCreateNewIndustry = () => {
    setIndustryDropdownOpen(false);
    setCreateNewIndustry(true);
    setIndustryId("");
    setIndustrySearch("");
    setIndustryDetails(null);
    setIndustryEditForm(INITIAL_INDUSTRY_EDIT);
  };

  const handleSaveIndustryDetails = async (e) => {
    e.preventDefault();
    if (!industryId) return;
    setSavingIndustry(true);
    try {
      const payload = {
        ...industryEditForm,
        area: industryEditForm.area || null,
      };
      const res = await industryService.update(industryId, payload);
      const data = res?.data || res;
      setIndustryDetails(data);
      toastSuccess("Client updated successfully");
    } catch (err) {
      toastError(err?.message || "Failed to update client");
    } finally {
      setSavingIndustry(false);
    }
  };

  const handleCreateIndustry = async (e) => {
    e.preventDefault();
    if (!industryEditForm.name?.trim()) {
      toastError("Client name is required");
      return;
    }
    const pm = (industryEditForm?.purchase_manager_phone || "").trim();
    if (pm && !/^\d{10}$/.test(pm)) {
      toastError("Purchase manager phone must be exactly 10 digits");
      return;
    }
    setCreatingIndustry(true);
    try {
      const payload = {
        ...industryEditForm,
        area: industryEditForm.area || null,
      };
      const res = await industryService.create(payload);
      const data = res?.data || res;
      const newIndustry = data;
      setIndustryId(newIndustry._id || newIndustry.id);
      setIndustryDetails(newIndustry);
      setIndustryEditForm({
        name: newIndustry?.name || "",
        area:
          typeof newIndustry?.area === "object"
            ? newIndustry?.area?._id || ""
            : newIndustry?.area || "",
        location: newIndustry?.location || "",
        address: newIndustry?.address || "",
        purchase_manager_name: newIndustry?.purchase_manager_name || "",
        purchase_manager_phone: newIndustry?.purchase_manager_phone || "",
        email: newIndustry?.email || "",
      });
      setCreateNewIndustry(false);
      setIndustrySearch(
        (newIndustry?.name || "") +
          (newIndustry?.location ? ` (${newIndustry.location})` : ""),
      );
      toastSuccess("Client created successfully");
    } catch (err) {
      toastError(err?.message || "Failed to create client");
    } finally {
      setCreatingIndustry(false);
    }
  };

  const handleClearIndustry = () => {
    setIndustryId("");
    setIndustrySearch("");
    setIndustryDetails(null);
    setCreateNewIndustry(false);
    setIndustryEditForm(INITIAL_INDUSTRY_EDIT);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      audioClipsRef.current.forEach((clip) => {
        if (clip.url) {
          URL.revokeObjectURL(clip.url);
        }
      });
    };
  }, []);

  const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const readBlobAsDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read audio file"));
      reader.readAsDataURL(blob);
    });

  const addAudioClip = async (blob, namePrefix = "voice-note") => {
    if (!blob || blob.size === 0) {
      return;
    }
    const extension =
      blob.type && blob.type.includes("/") ? blob.type.split("/")[1] : "webm";
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const url = URL.createObjectURL(blob);
    const durationSec = Math.max(
      1,
      Math.round(
        (Date.now() - (recordingStartRef.current || Date.now())) / 1000,
      ),
    );
    try {
      const dataUrl = await readBlobAsDataUrl(blob);
      setAudioClips((prev) => [
        ...prev,
        {
          id: `${namePrefix}-${timestamp}`,
          name: `${namePrefix}-${timestamp}.${extension}`,
          url,
          type: blob.type || "audio/webm",
          size: blob.size,
          durationSec,
          dataUrl,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      URL.revokeObjectURL(url);
      setAudioError(err?.message || "Unable to prepare audio clip.");
    }
  };

  const stopTracks = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const startRecording = async () => {
    setAudioError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setAudioError("Audio recording is not supported in this browser.");
      return;
    }
    if (!window.MediaRecorder) {
      setAudioError("MediaRecorder is not available in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      recordingStartRef.current = Date.now();
      setRecordingSeconds(0);
      setIsRecording(true);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });
        addAudioClip(blob);
        chunksRef.current = [];
        stopTracks();
      };

      mediaRecorder.start();
      timerRef.current = setInterval(() => {
        if (recordingStartRef.current) {
          const elapsed = Math.floor(
            (Date.now() - recordingStartRef.current) / 1000,
          );
          setRecordingSeconds(elapsed);
        }
      }, 500);
    } catch (err) {
      setAudioError("Microphone permission denied or unavailable.");
      stopTracks();
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  };

  const handleAudioUpload = async (e) => {
    const input = e.target;
    const files = Array.from(input.files || []);
    if (files.length === 0) {
      return;
    }
    try {
      for (const file of files) {
        const url = URL.createObjectURL(file);
        const dataUrl = await readBlobAsDataUrl(file);
        setAudioClips((prev) => [
          ...prev,
          {
            id: `${file.name}-${file.size}-${file.lastModified}`,
            name: file.name,
            url,
            type: file.type || "audio/*",
            size: file.size,
            durationSec: 0,
            dataUrl,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setAudioError(err?.message || "Failed to upload audio file.");
    } finally {
      input.value = "";
    }
  };

  const handleRemoveClip = (clipId) => {
    setAudioClips((prev) => {
      const clip = prev.find((item) => item.id === clipId);
      if (clip && clip.url) {
        URL.revokeObjectURL(clip.url);
      }
      return prev.filter((item) => item.id !== clipId);
    });
  };

  const DESCRIPTION_MIN_LENGTH = 5;
  const DESCRIPTION_MAX_LENGTH = 2000;
  const TITLE_MIN_LENGTH = 2;
  const TITLE_MAX_LENGTH = 200;
  const PRIORITY_MIN_LENGTH = 2;
  const PRIORITY_MAX_LENGTH = 50;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setDescriptionError("");

    const errs = {};
    const priority = (formData.priority || "").trim();
    if (!priority) errs.priority = "Priority is required";
    else if (priority.length < PRIORITY_MIN_LENGTH)
      errs.priority = `Priority must be at least ${PRIORITY_MIN_LENGTH} characters`;
    else if (priority.length > PRIORITY_MAX_LENGTH)
      errs.priority = `Priority must be at most ${PRIORITY_MAX_LENGTH} characters`;

    const title = (formData.title || "").trim();
    if (!title) errs.title = "Title is required";
    else if (title.length < TITLE_MIN_LENGTH)
      errs.title = `Title must be at least ${TITLE_MIN_LENGTH} characters`;
    else if (title.length > TITLE_MAX_LENGTH)
      errs.title = `Title must be at most ${TITLE_MAX_LENGTH} characters`;

    const desc = (formData.description || "").trim();
    if (!desc) errs.description = "Description is required";
    else if (desc.length < DESCRIPTION_MIN_LENGTH)
      errs.description = `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters`;
    else if (desc.length > DESCRIPTION_MAX_LENGTH)
      errs.description = `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters`;

    if (!industryId) errs.industry_id = "Please select or create a client";

    const storedUserJson = localStorage.getItem("migticrm_user");
    const storedUser = storedUserJson ? JSON.parse(storedUserJson) : null;
    const createdBy = storedUser?._id ?? user?.id ?? user?._id;
    if (!createdBy) {
      toastError("Unable to determine current user. Please log in again.");
      return;
    }

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      if (errs.description) {
        setDescriptionError(errs.description);
        setDescriptionTouched(true);
      }
      toastError("Please fix the errors before submitting.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      const files = audioClips.map((clip) => clip.dataUrl).filter(Boolean);
      await rawQueryService.create({
        ...formData,
        industryId,
        created_by: createdBy,
        files,
      });
      toastSuccess("Raw query created successfully");
      navigate("/raw-query");
    } catch (err) {
      toastError(err?.message || "Failed to create raw query");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Add Raw Query</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
              <div>
                <div className="mb-4">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    className="mt-1"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      setFieldErrors((p) => ({ ...p, title: undefined }));
                    }}
                    placeholder="Short title for the raw query"
                    required
                    aria-invalid={fieldErrors.title ? true : undefined}
                  />
                  {fieldErrors.title && (
                    <p className="mt-1 text-sm text-destructive">
                      {fieldErrors.title}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-4">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    id="priority"
                    className="mt-1"
                    value={formData.priority}
                    onChange={(e) => {
                      setFormData({ ...formData, priority: e.target.value });
                      setFieldErrors((p) => ({ ...p, priority: undefined }));
                    }}
                    aria-invalid={fieldErrors.priority ? true : undefined}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </Select>
                  {fieldErrors.priority && (
                    <p className="mt-1 text-sm text-destructive">
                      {fieldErrors.priority}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="relative mb-4" ref={dropdownRef}>
                <Label htmlFor="industrySearch">Client</Label>
                <Input
                  id="industrySearch"
                  type="text"
                  className="mt-1"
                  value={industrySearch}
                  onChange={(e) => {
                    setIndustrySearch(e.target.value);
                    setFieldErrors((p) => ({
                      ...p,
                      industry_id: undefined,
                    }));
                  }}
                  onFocus={() => setIndustryDropdownOpen(true)}
                  onBlur={() =>
                    setTimeout(() => setIndustryDropdownOpen(false), 200)
                  }
                  placeholder="Search client or create new..."
                  required={!industryId && !createNewIndustry}
                  disabled={!!industryId && !createNewIndustry}
                  autoComplete="off"
                  aria-invalid={fieldErrors.industry_id ? true : undefined}
                />
                {fieldErrors.industry_id && (
                  <p className="mt-1 text-sm text-destructive">
                    {fieldErrors.industry_id}
                  </p>
                )}
                {industryId && !createNewIndustry && (
                  <div className="mt-2">
                    <Button
                      variant="link"
                      size="sm"
                      type="button"
                      className="h-auto p-0"
                      onClick={handleClearIndustry}
                    >
                      Change client
                    </Button>
                  </div>
                )}
                {industryDropdownOpen && (
                  <div
                    className="absolute z-10 mt-1 w-full overflow-y-auto rounded-md border border-border bg-card shadow-md"
                    style={{
                      maxHeight: 280,
                    }}
                  >
                    <div className="divide-y divide-border">
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm font-semibold text-primary! hover:bg-accent"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCreateNewIndustry();
                        }}
                      >
                        + Create new client
                      </button>
                      {industrySearchLoading && (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Searching...
                        </div>
                      )}
                      {!industrySearchLoading &&
                        industrySearchResults.length === 0 && (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            {industrySearch.trim()
                              ? 'No clients found. Try "Create new".'
                              : "No clients in database. Create one below."}
                          </div>
                        )}
                      {!industrySearchLoading &&
                        industrySearchResults.map((industry) => (
                          <button
                            key={industry._id || industry.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-accent"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectIndustry(industry);
                            }}
                          >
                            <div className="text-sm font-medium">
                              {industry.name}
                            </div>
                            {(industry.location || industry.email) && (
                              <div className="text-xs text-muted-foreground">
                                {[industry.location, industry.email]
                                  .filter(Boolean)
                                  .join(" • ")}
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Editable industry details when an industry is selected */}
            {industryId && industryDetails && !createNewIndustry && (
              <div>
                <Card className="mb-4">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Client details (editable)</CardTitle>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveIndustryDetails}
                      disabled={savingIndustry}
                    >
                      {savingIndustry ? "Saving..." : "Save changes"}
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveIndustryDetails}>
                      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                        <div className="mb-4">
                          <Label>Client name</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.name}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Client name"
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Area</Label>
                          <Select
                            className="mt-1"
                            value={industryEditForm.area}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                area: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select area</option>
                            {areas.map((a) => (
                              <option key={a._id || a.id} value={a._id || a.id}>
                                {a.name}
                                {a.city ? ` - ${a.city}` : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="mb-4">
                          <Label>Location</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.location}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                location: e.target.value,
                              }))
                            }
                            placeholder="Location"
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            className="mt-1"
                            value={industryEditForm.email}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                            }
                            placeholder="Email"
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Purchase Manager Name</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.purchase_manager_name}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                purchase_manager_name: e.target.value,
                              }))
                            }
                            placeholder="Name"
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Purchase Manager Phone</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.purchase_manager_phone}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                purchase_manager_phone: e.target.value,
                              }))
                            }
                            placeholder="Phone"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-4">
                          <Label>Address</Label>
                          <Textarea
                            rows={2}
                            className="mt-1"
                            value={industryEditForm.address}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                address: e.target.value,
                              }))
                            }
                            placeholder="Address"
                          />
                        </div>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Create new industry form */}
            {createNewIndustry && (
              <div>
                <Card className="mb-4 border-primary!">
                  <CardHeader>
                    <CardTitle>Create new client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateIndustry}>
                      <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">
                        <div className="mb-4">
                          <Label>Client name *</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.name}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Client name"
                            required
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Area</Label>
                          <Select
                            className="mt-1"
                            value={industryEditForm.area}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                area: e.target.value,
                              }))
                            }
                          >
                            <option value="">Select area</option>
                            {areas.map((a) => (
                              <option key={a._id || a.id} value={a._id || a.id}>
                                {a.name}
                                {a.city ? ` - ${a.city}` : ""}
                              </option>
                            ))}
                          </Select>
                        </div>
                        <div className="mb-4">
                          <Label>Location</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.location}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                location: e.target.value,
                              }))
                            }
                            placeholder="Location"
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            className="mt-1"
                            value={industryEditForm.email}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                email: e.target.value,
                              }))
                            }
                            placeholder="Email"
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Purchase Manager Name</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.purchase_manager_name}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                purchase_manager_name: e.target.value,
                              }))
                            }
                            placeholder="Name"
                          />
                        </div>
                        <div className="mb-4">
                          <Label>Purchase Manager Phone</Label>
                          <Input
                            className="mt-1"
                            value={industryEditForm.purchase_manager_phone}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                purchase_manager_phone: e.target.value,
                              }))
                            }
                            placeholder="Phone"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="mb-4">
                          <Label>Address</Label>
                          <Textarea
                            rows={2}
                            className="mt-1"
                            value={industryEditForm.address}
                            onChange={(e) =>
                              setIndustryEditForm((f) => ({
                                ...f,
                                address: e.target.value,
                              }))
                            }
                            placeholder="Address"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          type="button"
                          onClick={() => {
                            setCreateNewIndustry(false);
                            setIndustryEditForm(INITIAL_INDUSTRY_EDIT);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={creatingIndustry}>
                          {creatingIndustry ? "Creating..." : "Create client"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}
            <div>
              <div className="mb-4">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  className="mt-1"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      description: e.target.value,
                    });
                    setDescriptionError("");
                  }}
                  onBlur={() => {
                    setDescriptionTouched(true);
                    const trimmed = (formData.description || "").trim();
                    if (
                      trimmed.length > 0 &&
                      trimmed.length < DESCRIPTION_MIN_LENGTH
                    ) {
                      setDescriptionError(
                        `Description must be at least ${DESCRIPTION_MIN_LENGTH} characters long.`,
                      );
                    } else {
                      setDescriptionError("");
                    }
                  }}
                  placeholder="Enter description (at least 5 characters)"
                  required
                  aria-invalid={descriptionError ? true : undefined}
                />
                {descriptionError && (
                  <p className="mt-1 text-sm text-destructive">
                    {descriptionError}
                  </p>
                )}
                {descriptionTouched &&
                  !descriptionError &&
                  (formData.description || "").trim().length > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {(formData.description || "").trim().length} characters
                    </p>
                  )}
              </div>
            </div>
            <div>
              <div className="mb-4">
                <Label>Voice Note (WhatsApp style)</Label>
                <div className="mb-2 mt-1 flex flex-wrap items-center gap-2">
                  <Button
                    variant={isRecording ? "destructive" : "default"}
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? "Stop Recording" : "Start Recording"}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {isRecording
                      ? `Recording ${formatDuration(recordingSeconds)}`
                      : "Ready to record"}
                  </span>
                  <Input
                    type="file"
                    accept="audio/*"
                    multiple
                    onChange={handleAudioUpload}
                    className="w-auto cursor-pointer file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-3 file:py-1 file:text-sm file:font-medium"
                  />
                </div>
                {audioError && (
                  <p className="mb-2 text-sm text-destructive">{audioError}</p>
                )}
                {audioClips.length > 0 ? (
                  <div className="rounded-md border border-border p-3">
                    {audioClips.map((clip) => (
                      <div
                        key={clip.id}
                        className="mb-2 flex flex-wrap items-center gap-3"
                      >
                        <audio controls src={clip.url} />
                        <div className="text-sm text-muted-foreground">
                          {clip.name}
                          {clip.durationSec
                            ? ` • ${formatDuration(clip.durationSec)}`
                            : ""}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          type="button"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveClip(clip.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No voice notes attached yet.
                  </p>
                )}
              </div>
            </div>
            {error && (
              <div className="mb-3 text-sm text-destructive">{error}</div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => navigate("/raw-query")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || isRecording}>
                {submitting ? "Creating..." : "Create"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default RawQueryCreate;
