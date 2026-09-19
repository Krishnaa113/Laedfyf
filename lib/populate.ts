import type { PopulateOptions } from "mongoose";

export const CLIENT_POPULATE: PopulateOptions[] = [
  {
    path: "assignedEmployeeId",
    select: "jobTitle department userId isActive",
    populate: { path: "userId", select: "name email" },
  },
];

export const VIDEO_POPULATE: PopulateOptions[] = [
  { path: "clientId", select: "name companyName status" },
  { path: "orderId", select: "packageName status contractedVideoCount" },
  { path: "scriptId", select: "videoNumber language status" },
  { path: "creatorId", select: "name location" },
  { path: "shootId", select: "location scheduledAt status" },
  {
    path: "editorId",
    select: "jobTitle userId",
    populate: { path: "userId", select: "name email" },
  },
  {
    path: "feedbackLog.authorId",
    select: "name email role",
  },
];

export const ORDER_POPULATE: PopulateOptions[] = [
  { path: "clientId", select: "name companyName status" },
  {
    path: "assignedEmployeeIds",
    select: "jobTitle department userId isActive",
    populate: { path: "userId", select: "name email" },
  },
];

export const SCRIPT_POPULATE: PopulateOptions[] = [
  { path: "clientId", select: "name companyName" },
  { path: "orderId", select: "packageName status contractedVideoCount" },
  {
    path: "writerId",
    select: "jobTitle department userId",
    populate: { path: "userId", select: "name email" },
  },
  { path: "creatorId", select: "name" },
  {
    path: "comments.authorId",
    select: "name email role",
  },
];

export const SHOOT_POPULATE: PopulateOptions[] = [
  { path: "clientId", select: "name companyName" },
  { path: "orderId", select: "packageName status" },
  { path: "creatorId", select: "name location availability" },
  {
    path: "cameramanId",
    select: "jobTitle userId",
    populate: { path: "userId", select: "name email" },
  },
  {
    path: "shootManagerId",
    select: "jobTitle userId",
    populate: { path: "userId", select: "name email" },
  },
  {
    path: "assistantId",
    select: "jobTitle userId",
    populate: { path: "userId", select: "name email" },
  },
  { path: "approvedScriptIds", select: "videoNumber status" },
];

export const PAYOUT_POPULATE: PopulateOptions[] = [
  { path: "creatorId", select: "name" },
  { path: "orderId", select: "packageName" },
  { path: "videoId", select: "status finalDeliveryLink" },
];

export const PAYMENT_POPULATE: PopulateOptions[] = [
  { path: "clientId", select: "name companyName status" },
  { path: "orderId", select: "packageName status" },
];

export const EXPENSE_POPULATE: PopulateOptions[] = [
  { path: "userId", select: "name email role" },
];

export const TASK_POPULATE: PopulateOptions[] = [
  { path: "assigneeId", select: "name email role employeeSubRole" },
  { path: "createdById", select: "name email role" },
  {
    path: "relatedTo.id",
    select: "name companyName packageName videoNumber status",
  },
];

export const TICKET_POPULATE: PopulateOptions[] = [
  { path: "clientId", select: "name companyName status" },
  { path: "orderId", select: "packageName status" },
  {
    path: "assignedEmployeeId",
    select: "jobTitle userId",
    populate: { path: "userId", select: "name email" },
  },
];
