import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  Plus,
  UserPlus,
  Trash2,
  FileText,
  Upload,
  Download,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./Workspace.css";
const API_URL = import.meta.env.VITE_API_URL;

const Workspace = () => {
  const navigate = useNavigate();

  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
const [workspaceFiles, setWorkspaceFiles] =
  useState([]);

const [loadingFiles, setLoadingFiles] =
  useState(false);

const [uploadingFile, setUploadingFile] =
  useState(false);
  const token = localStorage.getItem("token");

  const config = {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };

  const loadWorkspaces = async () => {
    try {
      setLoading(true);

      const response = await axios.get(
        `${API_URL}/workspaces`,
        config
      );

      setWorkspaces(response.data.workspaces || []);

      if (response.data.workspaces?.length > 0) {
        setSelectedWorkspace(response.data.workspaces[0]);
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Failed to load workspaces"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const createWorkspace = async (e) => {
    e.preventDefault();

    if (!name.trim()) return;

    try {
      const response = await axios.post(
        `${API_URL}/workspaces`,
        {
          name,
          description,
        },
        config
      );

      const newWorkspace = response.data.workspace;

      setWorkspaces((prev) => [
        newWorkspace,
        ...prev,
      ]);

      setSelectedWorkspace(newWorkspace);

      setName("");
      setDescription("");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to create workspace"
      );
    }
  };

  const addMember = async (e) => {
    e.preventDefault();

    if (!selectedWorkspace || !memberEmail.trim()) return;

    try {
      const response = await axios.post(
        `${API_URL}/workspaces/${selectedWorkspace._id}/members`,
        {
          email: memberEmail,
          role: memberRole,
        },
        config
      );

      setSelectedWorkspace(response.data.workspace);

      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace._id === selectedWorkspace._id
            ? response.data.workspace
            : workspace
        )
      );

      setMemberEmail("");
      setMemberRole("member");
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to add member"
      );
    }
  };

  const removeMember = async (userId) => {
    if (!selectedWorkspace) return;

    if (!window.confirm("Remove this member?")) {
      return;
    }

    try {
      const response = await axios.delete(
        `${API_URL}/workspaces/${selectedWorkspace._id}/members/${userId}`,
        config
      );

      setSelectedWorkspace(response.data.workspace);

      setWorkspaces((prev) =>
        prev.map((workspace) =>
          workspace._id === selectedWorkspace._id
            ? response.data.workspace
            : workspace
        )
      );
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to remove member"
      );
    }
  };

  const loadWorkspaceFiles = async (workspaceId) => {
    try {
      setLoadingFiles(true);

      const response = await axios.get(
        `${API_URL}/workspaces/${workspaceId}/files`,
        config
      );

      setWorkspaceFiles(response.data.files || []);
    } catch (err) {
      console.error("Failed to load workspace files:", err);
      setWorkspaceFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (selectedWorkspace?._id) {
      loadWorkspaceFiles(selectedWorkspace._id);
    } else {
      setWorkspaceFiles([]);
    }
  }, [selectedWorkspace?._id]);

  const uploadWorkspaceFile = async (e) => {
    const file = e.target.files?.[0];

    if (!file || !selectedWorkspace) return;

    try {
      setUploadingFile(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await axios.post(
        `${API_URL}/workspaces/${selectedWorkspace._id}/files`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setWorkspaceFiles((prev) => [
        response.data.file,
        ...prev,
      ]);
    } catch (err) {
      alert(
        err.response?.data?.message ||
          err.message ||
          "Failed to upload file"
      );
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const deleteWorkspaceFile = async (fileId) => {
    if (!window.confirm("Delete this file permanently?")) {
      return;
    }

    try {
      await axios.delete(
        `${API_URL}/workspaces/${selectedWorkspace._id}/files/${fileId}`,
        config
      );

      setWorkspaceFiles((prev) =>
        prev.filter((file) => file._id !== fileId)
      );
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to delete file"
      );
    }
  };

  const deleteWorkspaceById = async (workspaceId) => {
    const workspace = workspaces.find(
      (item) => item._id === workspaceId
    );

    if (!workspace) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_URL}/workspaces/${workspaceId}`,
        config
      );

      const remainingWorkspaces = workspaces.filter(
        (item) => item._id !== workspaceId
      );

      setWorkspaces(remainingWorkspaces);

      if (selectedWorkspace?._id === workspaceId) {
        setSelectedWorkspace(
          remainingWorkspaces.length > 0
            ? remainingWorkspaces[0]
            : null
        );
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          "Failed to delete workspace"
      );
    }
  };

  if (loading) {
    return (
      <div className="workspace-page">
        <div className="workspace-loading">
          Loading workspaces...
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">

      {/* Header */}
      <div className="workspace-header">
        <div>
          

          <h1>Workspace</h1>
          <p>
            Manage your teams and collaborate with members.
          </p>
        </div>
      </div>

      <div className="workspace-layout">

        {/* Sidebar */}
        <div className="workspace-sidebar">

          <div className="workspace-sidebar-title">
            <span>My Workspaces</span>
            <Plus size={18} />
          </div>

          {workspaces.length === 0 ? (
            <div className="workspace-empty-small">
              No workspaces yet.
            </div>
          ) : (
            workspaces.map((workspace) => (
              <div
                key={workspace._id}
                className={`workspace-list-item ${
                  selectedWorkspace?._id === workspace._id
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setSelectedWorkspace(workspace)
                }
              >
                <div className="workspace-avatar">
                  {workspace.name
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <div className="workspace-list-info">
                  <strong>{workspace.name}</strong>
                  <small>
                    {workspace.members?.length || 0} members
                  </small>
                </div>

                <button
                  type="button"
                  className="workspace-list-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteWorkspaceById(workspace._id);
                  }}
                  title="Delete workspace"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}

          {/* Create Workspace */}
          <form
            className="create-workspace-form"
            onSubmit={createWorkspace}
          >
            <h3>Create Workspace</h3>

            <input
              type="text"
              placeholder="Workspace name"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
            />

            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) =>
                setDescription(e.target.value)
              }
            />

            <button type="submit">
              <Plus size={17} />
              Create Workspace
            </button>
          </form>
        </div>

        {/* Main Content */}
        <div className="workspace-main">

          {error && (
            <div className="workspace-error">
              {error}
            </div>
          )}

          {!selectedWorkspace ? (
            <div className="workspace-no-selection">
              <h2>Create your first workspace</h2>
              <p>
                Workspaces help you organize your team
                and meetings.
              </p>
            </div>
          ) : (
            <>
              {/* Workspace Info */}
              <div className="workspace-card">
  <div className="workspace-info">
    <div className="workspace-big-avatar">
      {selectedWorkspace.name
        ?.charAt(0)
        .toUpperCase()}
    </div>

    <div>
      <h2>{selectedWorkspace.name}</h2>

      <p>
        {selectedWorkspace.description ||
          "No description provided."}
      </p>

      <span>
        {selectedWorkspace.members?.length || 0} team members
      </span>
    </div>
  </div>

</div>
              {/* Workspace Files */}
              <div className="workspace-card">
                <div className="section-heading">
                  <div>
                    <h2>Workspace Files</h2>
                    <p>
                      Project documents and shared resources.
                    </p>
                  </div>

                  <label className="upload-file-button">
                    <Upload size={17} />
                    {uploadingFile ? "Uploading..." : "Upload File"}
                    <input
                      type="file"
                      hidden
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp,.zip"
                      onChange={uploadWorkspaceFile}
                      disabled={uploadingFile}
                    />
                  </label>
                </div>

                {loadingFiles ? (
                  <div className="workspace-files-empty">
                    Loading files...
                  </div>
                ) : workspaceFiles.length === 0 ? (
                  <div className="workspace-files-empty">
                    <FileText size={30} />
                    <strong>No files yet</strong>
                    <span>
                      Upload project documents, presentations or other resources.
                    </span>
                  </div>
                ) : (
                  <div className="workspace-files-list">
                    {workspaceFiles.map((file) => {
                      const relativePath = file.filePath
                        ?.replace(/\\/g, "/")
                        .replace(/^.*?uploads\//, "uploads/");

const fileUrl = `${API_URL}/${relativePath}`;
                      const fileSize =
                        file.size < 1024 * 1024
                          ? `${(file.size / 1024).toFixed(1)} KB`
                          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

                      return (
                        <div
                          className="workspace-file-row"
                          key={file._id}
                        >
                          <div className="workspace-file-icon">
                            <FileText size={20} />
                          </div>

                          <div className="workspace-file-info">
                            <strong>{file.originalName}</strong>
                            <span>
                              {fileSize} •{" "}
                              {file.uploadedBy?.name || "Unknown"} •{" "}
                              {new Date(file.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="workspace-file-actions">
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="View file"
                            >
                              <Eye size={17} />
                            </a>

                            <a
                              href={fileUrl}
                              download={file.originalName}
                              title="Download file"
                            >
                              <Download size={17} />
                            </a>

                            <button
                              type="button"
                              onClick={() =>
                                deleteWorkspaceFile(file._id)
                              }
                              title="Delete file"
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Member */}
              <div className="workspace-card">
                <div className="section-heading">
                  <div>
                    <h2>Add Team Member</h2>
                    <p>
                      Add a registered IntellMeet user
                      using their email.
                    </p>
                  </div>

                  <UserPlus size={22} />
                </div>

                <form
                  className="add-member-form"
                  onSubmit={addMember}
                >
                  <input
                    type="email"
                    placeholder="member@example.com"
                    value={memberEmail}
                    onChange={(e) =>
                      setMemberEmail(e.target.value)
                    }
                  />

                  <select
                    value={memberRole}
                    onChange={(e) =>
                      setMemberRole(e.target.value)
                    }
                  >
                    <option value="member">
                      Member
                    </option>
                    <option value="admin">
                      Admin
                    </option>
                  </select>

                  <button type="submit">
                    <UserPlus size={17} />
                    Add Member
                  </button>
                </form>
              </div>

              {/* Members */}
              <div className="workspace-card">
                <div className="section-heading">
                  <div>
                    <h2>Team Members</h2>
                    <p>
                      People who belong to this workspace.
                    </p>
                  </div>
                </div>

                <div className="members-list">
                  {selectedWorkspace.members?.map(
                    (member) => (
                      <div
                        className="member-row"
                        key={member.user?._id}
                      >
                        <div className="member-left">
                          <div className="member-avatar">
                            {member.user?.name
                              ?.charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {member.user?.name}
                            </strong>

                            <span>
                              {member.user?.email}
                            </span>
                          </div>
                        </div>

                        <div className="member-right">
                          <span
                            className={`member-role ${member.role}`}
                          >
                            {member.role}
                          </span>

                          {member.role !== "owner" && (
                            <button
                              className="remove-member"
                              onClick={() =>
                                removeMember(
                                  member.user?._id
                                )
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Workspace;