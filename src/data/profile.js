import { getProfileById, DEFAULT_PROFILE_ID } from './profiles'

const defaultProfile = getProfileById(DEFAULT_PROFILE_ID)

export const PROFILE = {
  ...defaultProfile.personalInfo,
  education: defaultProfile.education
}
