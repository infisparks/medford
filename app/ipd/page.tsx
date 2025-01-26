// app/ipd/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { db } from '../../lib/firebase';
import { ref, push, update, onValue } from 'firebase/database';
import Head from 'next/head';
import { 
  AiOutlineUser, 
  AiOutlinePhone, 
  AiOutlineCalendar, 
  AiOutlineClockCircle, 
  AiOutlineInfoCircle, 
  AiOutlineMail 
} from 'react-icons/ai';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select, { SingleValue } from 'react-select';

interface IPDFormInput {
  name: string;
  email?: string;
  gender: { label: string; value: string };
  dateOfBirth: Date;
  age: number;
  bloodGroup: { label: string; value: string };
  date: Date;
  time: string;
  mobileNumber: string;
  emergencyMobileNumber?: string;
  membershipType: { label: string; value: string };
  roomType: { label: string; value: string };
  bed: { label: string; value: string };
  doctor: { label: string; value: string };
  referralDoctor?: string;
  admissionType: { label: string; value: string };
}

const AdmissionTypes = [
  { value: 'general', label: 'General' },
  { value: 'surgery', label: 'Surgery' },
  { value: 'accident_emergency', label: 'Accident/Emergency' },
  { value: 'day_observation', label: 'Day Observation' },
];

const GenderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const BloodGroupOptions = [
  { value: 'A+', label: 'A+' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B-', label: 'B-' },
  { value: 'AB+', label: 'AB+' },
  { value: 'AB-', label: 'AB-' },
  { value: 'O+', label: 'O+' },
  { value: 'O-', label: 'O-' },
];

const MembershipTypeOptions = [
  { value: 'regular', label: 'Regular' },
  { value: 'premium', label: 'Premium' },
  { value: 'vip', label: 'VIP' },
];

const RoomTypeOptions = [
  { value: 'female_ward', label: 'Female Ward (5 Rooms)' },
  { value: 'icu', label: 'ICU (3 Beds)' },
  { value: 'male_ward', label: 'Male Ward (5 Beds)' },
  { value: 'deluxe', label: 'Deluxe (2 Beds)' },
  { value: 'nicu', label: 'NICU (1 Bed)' },
];

function formatAMPM(date: Date): string {
  let hours = date.getHours();
  let minutes: string | number = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
}

const IPDBookingPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<IPDFormInput>({
    defaultValues: {
      date: new Date(),
      time: formatAMPM(new Date()),
      gender: { label: 'Male', value: 'male' },
      bloodGroup: { label: 'A+', value: 'A+' },
      membershipType: { label: 'Regular', value: 'regular' },
      roomType: { label: 'Female Ward (5 Rooms)', value: 'female_ward' },
      bed: { label: 'Bed 1', value: 'bed_1' },
      doctor: { label: 'Select Doctor', value: '' },
      admissionType: { label: 'General', value: 'general' },
      age: 0,
      dateOfBirth: new Date(),
      mobileNumber: '',
      referralDoctor: '',
      email: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<IPDFormInput | null>(null);
  const [doctors, setDoctors] = useState<{ label: string; value: string }[]>([]);
  const [beds, setBeds] = useState<{ label: string; value: string }[]>([]);
  const [selectedRoomType, setSelectedRoomType] = useState<{ label: string; value: string } | null>(null);

  useEffect(() => {
    const doctorsRef = ref(db, 'doctors');
    const unsubscribe = onValue(doctorsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const doctorsList = Object.keys(data)
          .filter(key => {
            const department = data[key].department.toLowerCase();
            return department === 'ipd' || department === 'both';
          })
          .map(key => ({
            label: data[key].name,
            value: key,
          }));
        setDoctors(doctorsList);
      } else {
        setDoctors([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedRoomType) {
      const bedsRef = ref(db, `beds/${selectedRoomType.value}`);
      const unsubscribe = onValue(bedsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const bedsList = Object.keys(data)
            .filter(key => data[key].status === "Available")
            .map(key => ({
              label: `Bed ${data[key].bedNumber}`,
              value: key,
            }));
          setBeds(bedsList);
          if (bedsList.length > 0) {
            setValue('bed', bedsList[0]);
          } else {
            setValue('bed', { label: 'No Bed', value: '' });
          }
        } else {
          setBeds([]);
          setValue('bed', { label: 'No Bed', value: '' });
        }
      });
      return () => unsubscribe();
    } else {
      setBeds([]);
      setValue('bed', { label: 'No Bed', value: '' });
    }
  }, [selectedRoomType, setValue]);

  const dateOfBirth = watch('dateOfBirth');

  useEffect(() => {
    if (dateOfBirth) {
      const calculatedAge = calculateAge(dateOfBirth);
      setValue('age', calculatedAge);
    }
  }, [dateOfBirth, setValue]);

  const calculateAge = (dob: Date): number => {
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const onSubmit: SubmitHandler<IPDFormInput> = async (data) => {
    setLoading(true);
    try {
      if (data.bed && data.bed.value && data.roomType.value) {
        const bedRef = ref(db, `beds/${data.roomType.value}/${data.bed.value}`);
        await update(bedRef, { status: "Occupied" });
      }

      const admissionData = {
        name: data.name,
        email: data.email || '',
        gender: data.gender.value,
        dateOfBirth: data.dateOfBirth.toISOString(),
        age: data.age,
        bloodGroup: data.bloodGroup.value,
        date: data.date.toISOString(),
        time: data.time,
        mobileNumber: data.mobileNumber,
        emergencyMobileNumber: data.emergencyMobileNumber || '',
        membershipType: data.membershipType.value,
        roomType: data.roomType.value,
        bed: data.bed.value,
        doctor: data.doctor.value,
        referralDoctor: data.referralDoctor || '',
        admissionType: data.admissionType.value,
        dischargeDate: '',
        createdAt: new Date().toISOString(),
      };

      const ipdRef = ref(db, 'ipd_bookings');
      const newIpdRef = push(ipdRef);
      await update(newIpdRef, admissionData);

      toast.success('IPD Admission booked successfully!', {
        position: "top-right",
        autoClose: 5000,
      });

      reset({
        date: new Date(),
        time: formatAMPM(new Date()),
        gender: { label: 'Male', value: 'male' },
        bloodGroup: { label: 'A+', value: 'A+' },
        membershipType: { label: 'Regular', value: 'regular' },
        roomType: { label: 'Female Ward (5 Rooms)', value: 'female_ward' },
        bed: { label: 'Bed 1', value: 'bed_1' },
        doctor: { label: 'Select Doctor', value: '' },
        admissionType: { label: 'General', value: 'general' },
        age: 0,
        dateOfBirth: new Date(),
        mobileNumber: '',
        referralDoctor: '',
        email: '',
      });
      setPreviewData(null);
    } catch (error) {
      console.error('Error booking IPD admission:', error);
      toast.error('Failed to book IPD admission. Please try again.', {
        position: "top-right",
        autoClose: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = () => {
    setPreviewData(watch());
  };

  // Determine if beds are available
  const bedsAvailable = beds.length > 0;

  return (
    <>
      <Head>
        <title>IPD Admission Form</title>
        <meta name="description" content="Book your IPD admission easily" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <ToastContainer />

      <main className="min-h-screen bg-gradient-to-r from-purple-100 to-pink-200 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl p-10">
          <h2 className="text-3xl font-bold text-center text-pink-600 mb-8">IPD Admission Form</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative">
              <AiOutlineUser className="absolute top-3 left-3 text-gray-400" />
              <input
                type="text"
                {...register('name', { required: 'Full Name is required' })}
                placeholder="Full Name"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                } transition duration-200`}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
            </div>

            <div className="relative">
              <AiOutlineMail className="absolute top-3 left-3 text-gray-400" />
              <input
                type="email"
                {...register('email', {
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Enter a valid email address',
                  },
                })}
                placeholder="Email (Optional)"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                } transition duration-200`}
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Gender</label>
              <Controller
                control={control}
                name="gender"
                rules={{ required: 'Gender is required' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={GenderOptions}
                    placeholder="Select Gender"
                    classNamePrefix="react-select"
                    className={`${errors.gender ? 'border-red-500' : 'border-gray-300'}`}
                    onChange={(value: SingleValue<{ label: string; value: string }>) => field.onChange(value)}
                    value={field.value}
                  />
                )}
              />
              {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <AiOutlineCalendar className="absolute top-3 left-3 text-gray-400" />
                <Controller
                  control={control}
                  name="dateOfBirth"
                  rules={{ required: 'Date of Birth is required' }}
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onChange={(date: Date | null) => {
                        if (date) field.onChange(date);
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Select Date of Birth"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                      } transition duration-200`}
                      showYearDropdown
                      scrollableYearDropdown
                      yearDropdownItemNumber={100}
                      maxDate={new Date()}
                    />
                  )}
                />
                {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
              </div>

              <div className="relative">
                <AiOutlineInfoCircle className="absolute top-3 left-3 text-gray-400" />
                <input
                  type="number"
                  {...register('age', { required: 'Age is required' })}
                  placeholder="Age"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    errors.age ? 'border-red-500' : 'border-gray-300'
                  } transition duration-200`}
                  readOnly
                />
                {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Blood Group</label>
              <Controller
                control={control}
                name="bloodGroup"
                rules={{ required: 'Blood Group is required' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={BloodGroupOptions}
                    placeholder="Select Blood Group"
                    classNamePrefix="react-select"
                    className={`${errors.bloodGroup ? 'border-red-500' : 'border-gray-300'}`}
                    onChange={(value: SingleValue<{ label: string; value: string }>) => field.onChange(value)}
                    value={field.value}
                  />
                )}
              />
              {errors.bloodGroup && <p className="text-red-500 text-sm mt-1">{errors.bloodGroup.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <AiOutlineCalendar className="absolute top-3 left-3 text-gray-400" />
                <Controller
                  control={control}
                  name="date"
                  rules={{ required: 'Date is required' }}
                  render={({ field }) => (
                    <DatePicker
                      selected={field.value}
                      onChange={(date: Date | null) => {
                        if (date) field.onChange(date);
                      }}
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Select Date"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                        errors.date ? 'border-red-500' : 'border-gray-300'
                      } transition duration-200`}
                      maxDate={new Date()}
                    />
                  )}
                />
                {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
              </div>

              <div className="relative">
                <AiOutlineClockCircle className="absolute top-3 left-3 text-gray-400" />
                <input
                  type="text"
                  {...register('time', { required: 'Time is required' })}
                  placeholder="Time"
                  className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                    errors.time ? 'border-red-500' : 'border-gray-300'
                  } transition duration-200`}
                  defaultValue={formatAMPM(new Date())}
                />
                {errors.time && <p className="text-red-500 text-sm mt-1">{errors.time.message}</p>}
              </div>
            </div>

            <div className="relative">
              <AiOutlinePhone className="absolute top-3 left-3 text-gray-400" />
              <input
                type="tel"
                {...register('mobileNumber', {
                  required: 'Mobile Number is required',
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Enter a valid 10-digit mobile number',
                  },
                })}
                placeholder="Mobile Number"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  errors.mobileNumber ? 'border-red-500' : 'border-gray-300'
                } transition duration-200`}
              />
              {errors.mobileNumber && <p className="text-red-500 text-sm mt-1">{errors.mobileNumber.message}</p>}
            </div>

            <div className="relative">
              <AiOutlinePhone className="absolute top-3 left-3 text-gray-400" />
              <input
                type="tel"
                {...register('emergencyMobileNumber', {
                  pattern: {
                    value: /^[0-9]{10}$/,
                    message: 'Enter a valid 10-digit emergency mobile number',
                  },
                })}
                placeholder="Emergency Mobile Number (Optional)"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  errors.emergencyMobileNumber ? 'border-red-500' : 'border-gray-300'
                } transition duration-200`}
              />
              {errors.emergencyMobileNumber && <p className="text-red-500 text-sm mt-1">{errors.emergencyMobileNumber.message}</p>}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Membership Type</label>
              <Controller
                control={control}
                name="membershipType"
                rules={{ required: 'Membership Type is required' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={MembershipTypeOptions}
                    placeholder="Select Membership Type"
                    classNamePrefix="react-select"
                    className={`${errors.membershipType ? 'border-red-500' : 'border-gray-300'}`}
                    onChange={(value: SingleValue<{ label: string; value: string }>) => field.onChange(value)}
                    value={field.value}
                  />
                )}
              />
              {errors.membershipType && <p className="text-red-500 text-sm mt-1">{errors.membershipType.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-700 mb-2">Room Type</label>
                <Controller
                  control={control}
                  name="roomType"
                  rules={{ required: 'Room Type is required' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={RoomTypeOptions}
                      placeholder="Select Room Type"
                      classNamePrefix="react-select"
                      className={`${errors.roomType ? 'border-red-500' : 'border-gray-300'}`}
                      onChange={(value: SingleValue<{ label: string; value: string }>) => {
                        field.onChange(value);
                        setSelectedRoomType(value);
                      }}
                      value={field.value}
                    />
                  )}
                />
                {errors.roomType && <p className="text-red-500 text-sm mt-1">{errors.roomType.message}</p>}
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Select Bed</label>
                <Controller
                  control={control}
                  name="bed"
                  rules={{ required: 'Bed selection is required' }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      options={beds}
                      placeholder={beds.length > 0 ? "Select Bed" : "No Beds Available"}
                      classNamePrefix="react-select"
                      className={`${errors.bed ? 'border-red-500' : 'border-gray-300'}`}
                      isDisabled={!selectedRoomType || beds.length === 0}
                      onChange={(value: SingleValue<{ label: string; value: string }>) => field.onChange(value)}
                      value={field.value}
                    />
                  )}
                />
                {errors.bed && <p className="text-red-500 text-sm mt-1">{errors.bed.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Under Care of Doctor</label>
              <Controller
                control={control}
                name="doctor"
                rules={{ required: 'Doctor selection is required' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={doctors}
                    placeholder="Select Doctor"
                    classNamePrefix="react-select"
                    className={`${errors.doctor ? 'border-red-500' : 'border-gray-300'}`}
                    onChange={(value: SingleValue<{ label: string; value: string }>) => field.onChange(value)}
                    value={field.value}
                  />
                )}
              />
              {errors.doctor && <p className="text-red-500 text-sm mt-1">{errors.doctor.message}</p>}
            </div>

            <div className="relative">
              <AiOutlineUser className="absolute top-3 left-3 text-gray-400" />
              <input
                type="text"
                {...register('referralDoctor')}
                placeholder="Referral Doctor (Optional)"
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                  errors.referralDoctor ? 'border-red-500' : 'border-gray-300'
                } transition duration-200`}
              />
              {errors.referralDoctor && <p className="text-red-500 text-sm mt-1">{errors.referralDoctor.message}</p>}
            </div>

            <div>
              <label className="block text-gray-700 mb-2">Admission Type</label>
              <Controller
                control={control}
                name="admissionType"
                rules={{ required: 'Admission Type is required' }}
                render={({ field }) => (
                  <Select
                    {...field}
                    options={AdmissionTypes}
                    placeholder="Select Admission Type"
                    classNamePrefix="react-select"
                    className={`${errors.admissionType ? 'border-red-500' : 'border-gray-300'}`}
                    onChange={(value: SingleValue<{ label: string; value: string }>) => field.onChange(value)}
                    value={field.value}
                  />
                )}
              />
              {errors.admissionType && <p className="text-red-500 text-sm mt-1">{errors.admissionType.message}</p>}
            </div>

            {/* Preview Button */}
            <button
              type="button"
              onClick={handlePreview}
              className="w-full py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={!bedsAvailable}
            >
              Preview
            </button>

            {/* Preview Modal */}
            {previewData && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl overflow-auto max-h-screen">
                  <h3 className="text-2xl font-semibold mb-4">Preview IPD Admission</h3>
                  <div className="space-y-2">
                    <p><strong>Full Name:</strong> {previewData.name}</p>
                    {previewData.email && <p><strong>Email:</strong> {previewData.email}</p>}
                    <p><strong>Gender:</strong> {previewData.gender.label}</p>
                    <p><strong>Date of Birth:</strong> {previewData.dateOfBirth.toLocaleDateString()}</p>
                    <p><strong>Age:</strong> {previewData.age}</p>
                    <p><strong>Blood Group:</strong> {previewData.bloodGroup.label}</p>
                    <p><strong>Date:</strong> {previewData.date.toLocaleDateString()}</p>
                    <p><strong>Time:</strong> {previewData.time}</p>
                    <p><strong>Mobile Number:</strong> {previewData.mobileNumber}</p>
                    {previewData.emergencyMobileNumber && <p><strong>Emergency Mobile Number:</strong> {previewData.emergencyMobileNumber}</p>}
                    <p><strong>Membership Type:</strong> {previewData.membershipType.label}</p>
                    <p><strong>Room Type:</strong> {previewData.roomType.label}</p>
                    <p><strong>Bed:</strong> {previewData.bed.label}</p>
                    <p><strong>Under Care of Doctor:</strong> {previewData.doctor.label}</p>
                    {previewData.referralDoctor && <p><strong>Referral Doctor:</strong> {previewData.referralDoctor}</p>}
                    <p><strong>Admission Type:</strong> {previewData.admissionType.label}</p>
                  </div>
                  <div className="mt-6 flex justify-end space-x-4">
                    <button
                      type="button"
                      onClick={() => setPreviewData(null)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition duration-200 ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={loading}
                    >
                      {loading ? 'Submitting...' : 'Confirm & Submit'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !bedsAvailable}
              className={`w-full py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 ${
                loading || !bedsAvailable ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Submitting...' : 'Submit Admission'}
            </button>

            {/* No Beds Available Message */}
            {!bedsAvailable && (
              <p className="text-red-500 text-center mt-4">
                No beds are available for the selected room type. Please choose a different room type.
              </p>
            )}
          </form>
        </div>
      </main>
    </>
  );
};

export default IPDBookingPage;
