import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
	const { id } = context.params || {};

	return {
		redirect: {
			destination: `/users/${id}`,
			permanent: false,
		},
	};
};

export default function StudentDetailPageRedirect() {
	return null;
}
